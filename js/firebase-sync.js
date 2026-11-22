// ============================================================================
// Firebase Firestore 실시간 클라우드 동기화 모듈 (js/firebase-sync.js)
// - Offline / Local Mode: Firebase 미설정 또는 CDN 미로드 시 100% localStorage 동작
// - Live Cloud Mode:
//   1) 공유 설정 문서: hanwoori_2026/config (식순, 연간행사, 결산, 설문, 단칙, 잠금, 선거 메타데이터)
//   2) 충돌 방지 투표 컬렉션: hanwoori_2026_votes
//      - 단칙 개정안 투표: agenda_${agendaId}_${safeMemberKey}
//      - 단장 선거 투표:   election_${safeMemberKey}
// ============================================================================

(function(global) {
    "use strict";

    var CONFIG_COLLECTION = "hanwoori_2026";
    var CONFIG_DOC_ID = "config";
    var VOTES_COLLECTION = "hanwoori_2026_votes";

    var db = null;
    var status = {
        connected: false,
        mode: "local", // "cloud" | "local"
        error: null,
        lastSyncAt: null,
        projectId: ""
    };

    var unsubConfig = null;
    var unsubVotes = null;
    var isApplyingRemoteUpdate = false;
    var pushDebounceTimer = null;

    // 메모리 캐시: config 스냅샷이 votes 스냅샷보다 나중에 도착하더라도 투표 집계 유지
    var cachedAgendaVotes = {};         // { [agendaId]: { [memberKey]: choice } }
    var cachedSingleElectionVotes = {}; // { [memberKey]: "approve"|"reject"|"abstain" }
    var cachedMultiElectionVotes = {};  // { [memberKey]: candidateId }

    function getAppStateRef() {
        try {
            if (typeof appState !== "undefined" && appState) return appState;
        } catch (e) {}
        return global.appState || null;
    }

    function sanitizeKey(raw) {
        return String(raw || "unknown").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }

    function formatFirebaseError(err) {
        if (!err) return "알 수 없는 오류";
        var code = err.code ? String(err.code) : "";
        var msg = err.message ? String(err.message) : String(err);
        if (code && msg.toLowerCase().indexOf(code.toLowerCase()) === -1) {
            return "[" + code + "] " + msg;
        }
        return msg || code || "알 수 없는 오류";
    }

    function notifyUiRefresh() {
        try {
            if (typeof global.renderSyncStatusUI === "function") {
                global.renderSyncStatusUI();
            }
        } catch (e) {}
        try {
            if (typeof global.renderAll === "function") {
                global.renderAll();
            }
        } catch (e) {}
    }

    function persistLocalWithoutCloudEcho() {
        var prev = isApplyingRemoteUpdate;
        isApplyingRemoteUpdate = true;
        try {
            if (typeof global.saveStateToStorage === "function") {
                global.saveStateToStorage({ skipCloudConfigPush: true });
            }
        } catch (e) {
        } finally {
            isApplyingRemoteUpdate = prev;
        }
    }

    /**
     * appState에서 운영진 편집 공유 데이터만 추출하여 Firestore config 페이로드 생성
     * (개별 단원 투표 맵인 memberVotes / multiMemberVotes는 제외하여 투표 덮어쓰기 방지)
     */
    function extractConfigPayload(state) {
        var s = state || (getAppStateRef());
        if (!s) return null;

        var agendasMeta = (Array.isArray(s.agendas) ? s.agendas : []).map(function(ag, idx) {
            var no = ag.no || ag.agendaNo || ag.number || (idx + 1);
            var locked = Boolean(ag.isLocked || ag.locked || ag.status === "closed" || ag.status === "locked");
            return {
                id: ag.id || ("ag-" + (idx + 1)),
                no: no,
                agendaNo: ag.agendaNo || no,
                number: ag.number || no,
                title: ag.title || "",
                author: ag.author || ag.proposer || "운영진 발의",
                proposer: ag.proposer || ag.author || "운영진 발의",
                chapter: ag.chapter || "",
                targetArticle: ag.targetArticle || ag.articleNo || "",
                articleNo: ag.articleNo || ag.targetArticle || "",
                category: ag.category || "단칙 개정",
                summary: ag.summary || "",
                desc: ag.summary || ag.desc || "",
                proposalReason: ag.proposalReason || ag.reason || "",
                reason: ag.reason || ag.proposalReason || "",
                beforeText: ag.beforeText || "",
                currentText: ag.beforeText || ag.currentText || "",
                afterText: ag.afterText || "",
                proposedText: ag.afterText || ag.proposedText || "",
                baseApprove: typeof ag.baseApprove === "number" ? ag.baseApprove : 0,
                baseReject: typeof ag.baseReject === "number" ? ag.baseReject : 0,
                baseAbstain: typeof ag.baseAbstain === "number" ? ag.baseAbstain : 0,
                voterTotal: ag.voterTotal || 37,
                passThreshold: ag.passThreshold || 25,
                isLocked: locked,
                locked: locked,
                status: locked ? "closed" : "voting"
            };
        });

        var elec = s.election || {};
        var electionCandidates = (Array.isArray(elec.candidates) ? elec.candidates : []).map(function(c) {
            return {
                id: c.id,
                name: c.name || "",
                gen: c.gen || "",
                part: c.part || "",
                company: c.company || "",
                title: c.title || "",
                photo: c.photo || "assets/cand_1.jpg",
                baseVotes: typeof c.baseVotes === "number" ? c.baseVotes : 0,
                pledge: c.pledge || "",
                career: c.career || ""
            };
        });

        var singleBase = elec.singleVotes || {};
        var isElecLocked = Boolean(elec.isLocked || elec.status === "closed");

        return {
            sessionTitle: s.sessionTitle || "2026 삼성한우리합창단 정기총회",
            quorum: {
                totalAttendees: typeof s.totalAttendees === "number" ? s.totalAttendees : ((typeof global.FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(global.FULL_MEMBER_ROSTER)) ? global.FULL_MEMBER_ROSTER.length : 134)
            },
            totalAttendees: typeof s.totalAttendees === "number" ? s.totalAttendees : ((typeof global.FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(global.FULL_MEMBER_ROSTER)) ? global.FULL_MEMBER_ROSTER.length : 134),
            winnerPagePublic: Boolean(s.winnerPagePublic),
            uploadedFileName: s.uploadedFileName || "",
            assemblySchedule: deepClone(Array.isArray(s.assemblySchedule) ? s.assemblySchedule : []),
            annualEvents: deepClone(Array.isArray(s.events) ? s.events : []),
            settlement: deepClone(s.settlement || {}),
            concertSurvey: deepClone(s.concertSurvey || {}),
            bylaws: deepClone(Array.isArray(s.bylaws) ? s.bylaws : []),
            electionStatus: isElecLocked ? "closed" : (elec.status || "in_progress"),
            electionMode: elec.mode || "single",
            electionIsLocked: isElecLocked,
            electionTotalVoters: elec.totalVoters || 38,
            electionSingleBase: {
                approve: typeof singleBase.approve === "number" ? singleBase.approve : 0,
                reject: typeof singleBase.reject === "number" ? singleBase.reject : 0,
                abstain: typeof singleBase.abstain === "number" ? singleBase.abstain : 0
            },
            electionCandidates: electionCandidates,
            agendasMeta: agendasMeta,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Firestore의 hanwoori_2026/config 문서를 appState에 병합 (기존 투표 맵 보존)
     */
    function applyRemoteConfig(data) {
        if (!data || typeof data !== "object") return;
        var s = getAppStateRef();
        if (!s) return;

        var preservedTab = s.activeTab;
        var preservedAgendaId = s.activeAgendaId;
        isApplyingRemoteUpdate = true;
        try {

            // ALWAYS keep s.members strictly synced to canonical FULL_MEMBER_ROSTER (never accept stale remote members)
            var canonicalRoster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER))
                ? FULL_MEMBER_ROSTER
                : (Array.isArray(global.FULL_MEMBER_ROSTER) ? global.FULL_MEMBER_ROSTER : null);
            if (canonicalRoster && canonicalRoster.length > 0) {
                s.members = deepClone(canonicalRoster);
                if (s.currentVoterId && !canonicalRoster.some(function(fm) { return fm.id === s.currentVoterId; })) {
                    s.currentVoterId = null;
                    s.hasExplicitLogin = false;
                    s.isAdminAuthenticated = false;
                    s.adminPreviewAsMember = false;
                }
            }

            if (typeof data.sessionTitle === "string" && data.sessionTitle) {
                s.sessionTitle = data.sessionTitle;
            }
            if (typeof data.totalAttendees === "number") {
                s.totalAttendees = data.totalAttendees;
            } else if (data.quorum && typeof data.quorum.totalAttendees === "number") {
                s.totalAttendees = data.quorum.totalAttendees;
            }
            if (typeof data.winnerPagePublic === "boolean") {
                s.winnerPagePublic = data.winnerPagePublic;
            }
            if (typeof data.uploadedFileName === "string") {
                s.uploadedFileName = data.uploadedFileName;
            }
            if (Array.isArray(data.assemblySchedule)) {
                var clonedSchedule = deepClone(data.assemblySchedule);
                if (typeof global.migrateAssemblyScheduleItems === "function") {
                    s.assemblySchedule = global.migrateAssemblyScheduleItems(clonedSchedule).items;
                } else {
                    s.assemblySchedule = clonedSchedule.map(function(item) {
                        if (!item || typeof item !== "object") return item;
                        var copy = Object.assign({}, item);
                        var titleStr = String(copy.title || "");
                        var isActivityReport =
                            copy.id === "sch-2" ||
                            (/활동\s*보고/.test(titleStr) && titleStr.indexOf("강평") === -1);
                        if (isActivityReport && (copy.targetTab === "concert" || copy.targetTab === "sectionConcertReview" || copy.targetTab === "concertReview")) {
                            copy.targetTab = "activity";
                        }
                        return copy;
                    });
                }
            }
            if (Array.isArray(s.assemblySchedule)) {
                s.assemblySchedule.forEach(function(item) {
                    if (item && typeof item.desc === "string" && item.desc.indexOf("164명") !== -1) {
                        var officialCount = (canonicalRoster && canonicalRoster.length) ? canonicalRoster.length : 134;
                        var quorumTwoThirds = Math.ceil((officialCount * 2) / 3);
                        item.desc = "재적 정단원 " + officialCount + "명 기준 성원 확인 완료 (개회·의결정족수 2/3 기준 " + quorumTwoThirds + "명/" + quorumTwoThirds + "표↑)";
                    }
                });
            }
            if (Array.isArray(data.annualEvents)) {
                s.events = deepClone(data.annualEvents);
            } else if (Array.isArray(data.events)) {
                s.events = deepClone(data.events);
            }
            if (data.settlement && typeof data.settlement === "object") {
                s.settlement = deepClone(data.settlement);
            }
            if (data.concertSurvey && typeof data.concertSurvey === "object") {
                s.concertSurvey = deepClone(data.concertSurvey);
            }
            if (Array.isArray(data.bylaws)) {
                s.bylaws = deepClone(data.bylaws);
            }

            // 선거 메타데이터 병합 (투표 맵 보존)
            if (!s.election) s.election = {};
            if (typeof data.electionMode === "string") {
                s.election.mode = data.electionMode;
            }
            if (typeof data.electionStatus === "string") {
                s.election.status = data.electionStatus;
            }
            if (typeof data.electionIsLocked === "boolean") {
                s.election.isLocked = data.electionIsLocked;
            } else if (typeof data.electionStatus === "string") {
                s.election.isLocked = (data.electionStatus === "closed");
            }
            if (typeof data.electionTotalVoters === "number") {
                s.election.totalVoters = data.electionTotalVoters;
            }
            if (Array.isArray(data.electionCandidates)) {
                s.election.candidates = deepClone(data.electionCandidates);
            }
            if (!s.election.singleVotes) {
                s.election.singleVotes = { approve: 0, reject: 0, abstain: 0, memberVotes: {} };
            }
            if (data.electionSingleBase && typeof data.electionSingleBase === "object") {
                if (typeof data.electionSingleBase.approve === "number") s.election.singleVotes.approve = data.electionSingleBase.approve;
                if (typeof data.electionSingleBase.reject === "number") s.election.singleVotes.reject = data.electionSingleBase.reject;
                if (typeof data.electionSingleBase.abstain === "number") s.election.singleVotes.abstain = data.electionSingleBase.abstain;
            }
            if (!s.election.singleVotes.memberVotes) s.election.singleVotes.memberVotes = {};
            if (!s.election.multiMemberVotes) s.election.multiMemberVotes = {};

            // 안건 메타데이터 병합 (기존 또는 클라우드 캐시된 memberVotes 보존)
            if (Array.isArray(data.agendasMeta) && data.agendasMeta.length > 0) {
                var existingVotesByAgenda = {};
                (s.agendas || []).forEach(function(ag) {
                    if (ag && ag.id) {
                        existingVotesByAgenda[ag.id] = ag.memberVotes || {};
                    }
                });

                s.agendas = data.agendasMeta.map(function(meta, idx) {
                    var agId = meta.id || ("ag-" + (idx + 1));
                    var locked = Boolean(meta.isLocked || meta.locked || meta.status === "closed" || meta.status === "locked");
                    var mergedVotes = Object.assign(
                        {},
                        existingVotesByAgenda[agId] || {},
                        cachedAgendaVotes[agId] || {}
                    );
                    var no = meta.no || meta.agendaNo || meta.number || (idx + 1);
                    return {
                        id: agId,
                        no: no,
                        agendaNo: meta.agendaNo || no,
                        number: meta.number || no,
                        title: meta.title || ("제" + no + "호 안건"),
                        author: meta.author || meta.proposer || "운영진 발의",
                        proposer: meta.proposer || meta.author || "운영진 발의",
                        chapter: meta.chapter || "",
                        targetArticle: meta.targetArticle || meta.articleNo || "",
                        articleNo: meta.articleNo || meta.targetArticle || "",
                        category: meta.category || "단칙 개정",
                        summary: meta.summary || meta.desc || "",
                        proposalReason: meta.proposalReason || meta.reason || "",
                        reason: meta.reason || meta.proposalReason || "",
                        beforeText: meta.beforeText || meta.currentText || "",
                        afterText: meta.afterText || meta.proposedText || "",
                        baseApprove: typeof meta.baseApprove === "number" ? meta.baseApprove : 0,
                        baseReject: typeof meta.baseReject === "number" ? meta.baseReject : 0,
                        baseAbstain: typeof meta.baseAbstain === "number" ? meta.baseAbstain : 0,
                        voterTotal: meta.voterTotal || 37,
                        passThreshold: meta.passThreshold || 25,
                        isLocked: locked,
                        status: locked ? "closed" : "voting",
                        memberVotes: mergedVotes,
                        voters: deepClone(mergedVotes)
                    };
                });

                if (preservedAgendaId && s.agendas.some(function(a) { return a.id === preservedAgendaId; })) {
                    s.activeAgendaId = preservedAgendaId;
                } else if (!s.agendas.some(function(a) { return a.id === s.activeAgendaId; })) {
                    s.activeAgendaId = s.agendas[0].id;
                }
            }

            // Never let incoming remote config overwrite user's local navigation state
            if (preservedTab) {
                s.activeTab = preservedTab;
            }

            status.lastSyncAt = new Date().toISOString();
            persistLocalWithoutCloudEcho();
            notifyUiRefresh();
        } finally {
            isApplyingRemoteUpdate = false;
        }
    }

    /**
     * Firestore의 hanwoori_2026_votes 컬렉션 스냅샷으로부터
     * 각 안건의 memberVotes / agree / disagree / abstain 및 선거 투표 맵을 재구성
     */
    function applyRemoteVotesSnapshot(snapshot) {
        var s = getAppStateRef();
        if (!snapshot || !s) return;

        var preservedTab = s.activeTab;
        var preservedAgendaId = s.activeAgendaId;
        isApplyingRemoteUpdate = true;
        try {
            var newAgendaVotes = {};
            var newSingleVotes = {};
            var newMultiVotes = {};
            var electionVotersMap = {};

            snapshot.forEach(function(doc) {
                var d = typeof doc.data === "function" ? doc.data() : doc;
                if (!d || typeof d !== "object") return;

                if (d.type === "agenda" && d.agendaId && d.memberKey && d.choice) {
                    if (!newAgendaVotes[d.agendaId]) {
                        newAgendaVotes[d.agendaId] = {};
                    }
                    newAgendaVotes[d.agendaId][d.memberKey] = d.choice;
                } else if (d.type === "election" && d.memberKey) {
                    var val = d.candidateId || d.choice;
                    if (!val) return;
                    electionVotersMap[d.memberKey] = val;
                    if (val === "approve" || val === "reject" || val === "abstain") {
                        newSingleVotes[d.memberKey] = val;
                    } else {
                        newMultiVotes[d.memberKey] = val;
                    }
                }
            });

            cachedAgendaVotes = newAgendaVotes;
            cachedSingleElectionVotes = newSingleVotes;
            cachedMultiElectionVotes = newMultiVotes;

            // 각 안건의 memberVotes 및 집계 보조 필드 업데이트
            (s.agendas || []).forEach(function(ag) {
                var votesMap = deepClone(newAgendaVotes[ag.id] || {});
                ag.memberVotes = votesMap;
                ag.voters = deepClone(votesMap);

                var agreeCount = typeof ag.baseApprove === "number" ? ag.baseApprove : 0;
                var disagreeCount = typeof ag.baseReject === "number" ? ag.baseReject : 0;
                var abstainCount = typeof ag.baseAbstain === "number" ? ag.baseAbstain : 0;
                Object.keys(votesMap).forEach(function(mk) {
                    if (votesMap[mk] === "approve") agreeCount += 1;
                    else if (votesMap[mk] === "reject") disagreeCount += 1;
                    else if (votesMap[mk] === "abstain") abstainCount += 1;
                });
                ag.agree = agreeCount;
                ag.disagree = disagreeCount;
                ag.abstain = abstainCount;
            });

            // 단장 선거 투표 맵 및 후보별 집계 업데이트
            if (s.election) {
                if (!s.election.singleVotes) {
                    s.election.singleVotes = { approve: 0, reject: 0, abstain: 0, memberVotes: {} };
                }
                s.election.singleVotes.memberVotes = deepClone(newSingleVotes);
                s.election.multiMemberVotes = deepClone(newMultiVotes);
                s.election.electionVoters = deepClone(electionVotersMap);
            }

            // Never let incoming live vote updates reset user's local tab or selected agenda
            if (preservedTab) {
                s.activeTab = preservedTab;
            }
            if (preservedAgendaId) {
                s.activeAgendaId = preservedAgendaId;
            }

            status.lastSyncAt = new Date().toISOString();
            persistLocalWithoutCloudEcho();
            notifyUiRefresh();
        } finally {
            isApplyingRemoteUpdate = false;
        }
    }

    /**
     * FirebaseSync 초기화
     */
    function init() {
        var configured = (typeof global.isFirebaseConfigured === "function") && global.isFirebaseConfigured();
        if (!configured) {
            status = {
                connected: false,
                mode: "local",
                error: null,
                lastSyncAt: null,
                projectId: ""
            };
            notifyUiRefresh();
            return status;
        }

        var cfg = global.HANWOORI_FIREBASE_CONFIG || {};
        if (typeof global.firebase === "undefined" || typeof global.firebase.firestore !== "function") {
            status = {
                connected: false,
                mode: "cloud",
                error: "Firebase SDK를 불러오지 못했습니다. 인터넷 연결 또는 스크립트 차단을 확인하세요.",
                lastSyncAt: null,
                projectId: cfg.projectId || ""
            };
            notifyUiRefresh();
            return status;
        }

        try {
            if (!global.firebase.apps || global.firebase.apps.length === 0) {
                global.firebase.initializeApp(cfg);
            }
            db = global.firebase.firestore();
            status = {
                connected: false,
                mode: "cloud",
                error: null,
                lastSyncAt: null,
                projectId: cfg.projectId || ""
            };
            notifyUiRefresh();

            // 기존 리스너 정리
            if (typeof unsubConfig === "function") {
                try { unsubConfig(); } catch (e) {}
            }
            if (typeof unsubVotes === "function") {
                try { unsubVotes(); } catch (e) {}
            }

            // 1) 공유 설정 문서 실시간 구독 (없으면 최초 1회 자동 시드)
            var configRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);
            unsubConfig = configRef.onSnapshot(function(doc) {
                status.connected = true;
                status.error = null;
                status.lastSyncAt = new Date().toISOString();
                if (!doc || !doc.exists) {
                    notifyUiRefresh();
                    var seedPayload = extractConfigPayload(getAppStateRef());
                    if (seedPayload) {
                        configRef.set(seedPayload, { merge: true }).then(function() {
                            status.connected = true;
                            status.error = null;
                            status.lastSyncAt = new Date().toISOString();
                            notifyUiRefresh();
                        }).catch(function(err) {
                            status.connected = false;
                            status.error = formatFirebaseError(err);
                            notifyUiRefresh();
                        });
                    }
                    return;
                }
                applyRemoteConfig(doc.data());
            }, function(err) {
                status.connected = false;
                status.error = formatFirebaseError(err);
                notifyUiRefresh();
            });

            // 2) 충돌 방지 투표 컬렉션 실시간 구독
            var votesRef = db.collection(VOTES_COLLECTION);
            unsubVotes = votesRef.onSnapshot(function(snapshot) {
                status.connected = true;
                status.error = null;
                applyRemoteVotesSnapshot(snapshot);
            }, function(err) {
                status.connected = false;
                status.error = formatFirebaseError(err);
                notifyUiRefresh();
            });
        } catch (err) {
            db = null;
            status = {
                connected: false,
                mode: "cloud",
                error: formatFirebaseError(err),
                lastSyncAt: null,
                projectId: cfg.projectId || ""
            };
            notifyUiRefresh();
        }

        return status;
    }

    /**
     * 운영진 편집 공유 설정을 hanwoori_2026/config 문서에 반영
     */
    function pushConfigToCloud(state, options) {
        var opts = options || {};
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        if (isApplyingRemoteUpdate && !opts.force) {
            return Promise.resolve({ skipped: true, reason: "remote_echo_guard" });
        }

        var doPush = function() {
            var payload = extractConfigPayload(state || getAppStateRef());
            if (!payload) return Promise.resolve({ skipped: true, reason: "empty_state" });
            return db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).set(payload, { merge: true })
                .then(function() {
                    status.connected = true;
                    status.error = null;
                    status.lastSyncAt = new Date().toISOString();
                    notifyUiRefresh();
                    return { ok: true };
                })
                .catch(function(err) {
                    status.connected = false;
                    status.error = formatFirebaseError(err);
                    notifyUiRefresh();
                    return { ok: false, error: status.error };
                });
        };

        if (opts.immediate) {
            if (pushDebounceTimer) {
                clearTimeout(pushDebounceTimer);
                pushDebounceTimer = null;
            }
            return doPush();
        }

        return new Promise(function(resolve) {
            if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
            pushDebounceTimer = setTimeout(function() {
                pushDebounceTimer = null;
                doPush().then(resolve);
            }, 150);
        });
    }

    /**
     * 단칙 개정안 개별 투표 원자적 기록: hanwoori_2026_votes/agenda_${agendaId}_${safeMemberKey}
     */
    function submitAgendaVoteToCloud(agendaId, memberKey, memberName, choice) {
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        if (!agendaId || !memberKey || !choice) {
            return Promise.resolve({ skipped: true, reason: "invalid_args" });
        }
        var safeMemberKey = sanitizeKey(memberKey);
        var docId = "agenda_" + sanitizeKey(agendaId) + "_" + safeMemberKey;
        var payload = {
            type: "agenda",
            agendaId: String(agendaId),
            memberKey: String(memberKey),
            memberName: String(memberName || ""),
            choice: String(choice),
            updatedAt: new Date().toISOString()
        };
        return db.collection(VOTES_COLLECTION).doc(docId).set(payload, { merge: true })
            .then(function() {
                status.lastSyncAt = new Date().toISOString();
                return { ok: true, docId: docId };
            })
            .catch(function(err) {
                status.error = err && err.message ? err.message : String(err);
                notifyUiRefresh();
                return { ok: false, error: status.error };
            });
    }

    /**
     * 단칙 개정안 개별 투표 취소(삭제): hanwoori_2026_votes/agenda_${agendaId}_${safeMemberKey}
     */
    function deleteAgendaVoteFromCloud(agendaId, memberKey) {
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        if (!agendaId || !memberKey) {
            return Promise.resolve({ skipped: true, reason: "invalid_args" });
        }
        var safeMemberKey = sanitizeKey(memberKey);
        var docId = "agenda_" + sanitizeKey(agendaId) + "_" + safeMemberKey;
        return db.collection(VOTES_COLLECTION).doc(docId).delete()
            .then(function() {
                if (cachedAgendaVotes[agendaId] && cachedAgendaVotes[agendaId][memberKey]) {
                    delete cachedAgendaVotes[agendaId][memberKey];
                }
                status.lastSyncAt = new Date().toISOString();
                return { ok: true, docId: docId, deleted: true };
            })
            .catch(function(err) {
                status.error = err && err.message ? err.message : String(err);
                notifyUiRefresh();
                return { ok: false, error: status.error };
            });
    }

    /**
     * 단장 선거 개별 투표 원자적 기록: hanwoori_2026_votes/election_${safeMemberKey}
     */
    function submitElectionVoteToCloud(memberKey, memberName, candidateId) {
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        if (!memberKey || !candidateId) {
            return Promise.resolve({ skipped: true, reason: "invalid_args" });
        }
        var safeMemberKey = sanitizeKey(memberKey);
        var docId = "election_" + safeMemberKey;
        var payload = {
            type: "election",
            memberKey: String(memberKey),
            memberName: String(memberName || ""),
            candidateId: String(candidateId),
            updatedAt: new Date().toISOString()
        };
        return db.collection(VOTES_COLLECTION).doc(docId).set(payload, { merge: true })
            .then(function() {
                status.lastSyncAt = new Date().toISOString();
                return { ok: true, docId: docId };
            })
            .catch(function(err) {
                status.error = err && err.message ? err.message : String(err);
                notifyUiRefresh();
                return { ok: false, error: status.error };
            });
    }

    /**
     * 운영진 투표 초기화 시 hanwoori_2026_votes 컬렉션 전체 삭제
     */
    function resetVotesInCloud() {
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        return db.collection(VOTES_COLLECTION).get()
            .then(function(snapshot) {
                if (!snapshot || snapshot.empty) {
                    cachedAgendaVotes = {};
                    cachedSingleElectionVotes = {};
                    cachedMultiElectionVotes = {};
                    return { ok: true, deleted: 0 };
                }
                var deletions = [];
                snapshot.forEach(function(doc) {
                    if (doc && doc.ref && typeof doc.ref.delete === "function") {
                        deletions.push(doc.ref.delete());
                    } else if (doc && doc.id) {
                        deletions.push(db.collection(VOTES_COLLECTION).doc(doc.id).delete());
                    }
                });
                return Promise.all(deletions).then(function() {
                    cachedAgendaVotes = {};
                    cachedSingleElectionVotes = {};
                    cachedMultiElectionVotes = {};
                    status.lastSyncAt = new Date().toISOString();
                    return { ok: true, deleted: deletions.length };
                });
            })
            .catch(function(err) {
                status.error = err && err.message ? err.message : String(err);
                notifyUiRefresh();
                return { ok: false, error: status.error };
            });
    }

    function getStatus() {
        return {
            connected: status.connected,
            mode: status.mode,
            error: status.error,
            lastSyncAt: status.lastSyncAt,
            projectId: status.projectId
        };
    }

    function isApplyingRemote() {
        return isApplyingRemoteUpdate;
    }

    global.FirebaseSync = {
        init: init,
        pushConfigToCloud: pushConfigToCloud,
        submitAgendaVoteToCloud: submitAgendaVoteToCloud,
        deleteAgendaVoteFromCloud: deleteAgendaVoteFromCloud,
        submitElectionVoteToCloud: submitElectionVoteToCloud,
        resetVotesInCloud: resetVotesInCloud,
        getStatus: getStatus,
        isApplyingRemote: isApplyingRemote
    };
})(typeof window !== "undefined" ? window : globalThis);
