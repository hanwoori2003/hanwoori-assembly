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
    var cachedSingleElectionVotes = {};
    var cachedAttendanceVotes = {}; // { [memberKey]: "approve"|"reject"|"abstain" }
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
                title: String(ag.title || "").replace(/\s*\[가결\]\s*/g, " ").trim(),
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
                baseApprove: 0,
                baseReject: 0,
                baseAbstain: 0,
                voterTotal: 0,
                passThreshold: Math.ceil(((typeof s.onsiteAttendees === "number" && s.onsiteAttendees > 0 ? s.onsiteAttendees : 45) * 2) / 3),
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
                baseVotes: 0,
                recommendation: c.recommendation || "",
                manifestoTitle: c.manifestoTitle || "",
                manifesto: c.manifesto || "",
                pledge: c.pledge || "",
                career: c.career || ""
            };
        });

        var singleBase = elec.singleVotes || {};
        var isElecLocked = Boolean(elec.isLocked || elec.status === "closed");

        return {
            sessionTitle: s.sessionTitle || "2026 삼성한우리합창단 정기총회",
            quorum: {
                totalAttendees: typeof s.totalAttendees === "number" ? s.totalAttendees : ((typeof global.FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(global.FULL_MEMBER_ROSTER)) ? global.FULL_MEMBER_ROSTER.length : 135)
            },
            totalAttendees: typeof s.totalAttendees === "number" ? s.totalAttendees : ((typeof global.FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(global.FULL_MEMBER_ROSTER)) ? global.FULL_MEMBER_ROSTER.length : 135),
            onsiteAttendees: typeof s.onsiteAttendees === "number" ? s.onsiteAttendees : 45,
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
            electionTotalVoters: 0,
            electionSingleBase: {
                approve: 0,
                reject: 0,
                abstain: 0
            },
            electionCandidates: electionCandidates,
            attendanceSurveyMeta: {
                deadline: (s.attendanceSurvey && s.attendanceSurvey.deadline) || "2026년 12월 12일 23:59",
                targetTotal: typeof s.totalAttendees === "number" ? s.totalAttendees : 135,
                quorumThreshold: Math.ceil(((typeof s.totalAttendees === "number" ? s.totalAttendees : 135) * 2) / 3)
            },
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
                if (s.currentVoterId === "mem-80" || s.currentVoterName === "윤지헌") {
                    s.currentVoterName = "윤지현";
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
            if (typeof data.onsiteAttendees === "number" && data.onsiteAttendees > 0) {
                s.onsiteAttendees = data.onsiteAttendees;
            }
            if (typeof data.winnerPagePublic === "boolean") {
                s.winnerPagePublic = data.winnerPagePublic;
            }
            if (typeof data.uploadedFileName === "string") {
                s.uploadedFileName = data.uploadedFileName;
            }
            if (Array.isArray(data.assemblySchedule)) {
                var clonedSchedule = deepClone(data.assemblySchedule);
                var scheduleHasLegacy = clonedSchedule.some(function(item) {
                    if (!item || typeof item !== "object") return true;
                    var fullText = String(item.title || "") + " " + String(item.desc || "") + " " + String(item.targetTab || "");
                    return /(164명|136명|131명|88명|140명|91명|12개|6개|지휘자\s*임기|대외수익|sectionConcertReview)/.test(fullText);
                });
                if (scheduleHasLegacy && typeof global.getDefaultState === "function") {
                    s.assemblySchedule = deepClone(global.getDefaultState().assemblySchedule);
                } else if (typeof global.migrateAssemblyScheduleItems === "function") {
                    s.assemblySchedule = global.migrateAssemblyScheduleItems(clonedSchedule).items;
                } else {
                    s.assemblySchedule = clonedSchedule;
                }
            }
            if (Array.isArray(s.assemblySchedule)) {
                var scheduleNeedsSyncPush = false;
                if (typeof global.migrateAssemblyScheduleItems === "function") {
                    var syncMigRes = global.migrateAssemblyScheduleItems(s.assemblySchedule);
                    s.assemblySchedule = syncMigRes.items;
                    if (syncMigRes.changed) {
                        scheduleNeedsSyncPush = true;
                    }
                }
                if (scheduleNeedsSyncPush && typeof global.saveStateToStorage === "function") {
                    setTimeout(function() {
                        global.saveStateToStorage({ skipCloudPush: false });
                    }, 600);
                }
            }
            var remoteEvents = Array.isArray(data.annualEvents)
                ? data.annualEvents
                : (Array.isArray(data.events) ? data.events : null);
            if (remoteEvents && remoteEvents.length >= 10) {
                var clonedEvents = deepClone(remoteEvents);
                if (typeof global.backfillAnnualEventPhotos === "function") {
                    s.events = global.backfillAnnualEventPhotos(clonedEvents).items;
                } else {
                    var defaultsList = (typeof INITIAL_ANNUAL_EVENTS !== "undefined" && Array.isArray(INITIAL_ANNUAL_EVENTS))
                        ? INITIAL_ANNUAL_EVENTS
                        : (Array.isArray(global.INITIAL_ANNUAL_EVENTS) ? global.INITIAL_ANNUAL_EVENTS : []);
                    s.events = clonedEvents.map(function(ev) {
                        if (!ev || typeof ev !== "object") return ev;
                        if (Array.isArray(ev.photos) && ev.photos.length > 0) return ev;
                        var match = defaultsList.find(function(d) {
                            return d && ((ev.id && d.id === ev.id) || (ev.title && d.title && String(d.title).trim() === String(ev.title).trim()));
                        });
                        if (match && Array.isArray(match.photos) && match.photos.length > 0) {
                            ev.photos = match.photos.slice();
                        }
                        return ev;
                    });
                }
                // Enforce 2026 concert venue and orchestra details
                if (Array.isArray(s.events)) {
                    s.events.forEach(function(ev) {
                        if (ev && (ev.id === "ev-11" || String(ev.title || "").indexOf("정기연주회") !== -1)) {
                            if (ev.place === "KBS홀" || String(ev.desc || "").indexOf("KBS홀") !== -1 || String(ev.desc || "").indexOf("솔리스트") !== -1) {
                                ev.title = "2026년 정기연주회";
                                ev.place = "인재개발원 콘서트홀";
                                ev.desc = "인재개발원 콘서트홀 · 오케스트라(라퓨즈 플레이어즈) 협연";
                            }
                        }
                    });
                }
            } else if (!Array.isArray(s.events) || s.events.length < 10) {
                if (typeof global.getDefaultState === "function") {
                    s.events = deepClone(global.getDefaultState().events);
                }
            }
            if (data.settlement && typeof data.settlement === "object") {
                // If cloud data still has legacy 2025/mock values or prior 1st draft settlement without concert additions, enforce updated audit data
                if (data.settlement.totalRevenue === 109910000 || data.settlement.balance === 20887349 || !data.settlement.concertExpense || !data.settlement.concertExpense.additionalSection || data.settlement.totalRevenue === 78460000) {
                    if (typeof global.getDefaultState === "function") {
                        s.settlement = deepClone(global.getDefaultState().settlement);
                        // Trigger immediate cloud push to overwrite stale legacy config in Firestore
                        setTimeout(function() {
                            if (typeof global.manualPushConfigToCloud === "function") {
                                global.manualPushConfigToCloud();
                            }
                        }, 500);
                    }
                } else {
                    s.settlement = deepClone(data.settlement);
                }
            }
            if (data.attendanceSurveyMeta && typeof data.attendanceSurveyMeta === "object") {
                if (!s.attendanceSurvey) s.attendanceSurvey = { votes: {} };
                s.attendanceSurvey.deadline = data.attendanceSurveyMeta.deadline || "2026년 12월 12일 23:59";
                s.attendanceSurvey.targetTotal = data.attendanceSurveyMeta.targetTotal || 135;
                s.attendanceSurvey.quorumThreshold = data.attendanceSurveyMeta.quorumThreshold || 90;
                if (!s.attendanceSurvey.votes) s.attendanceSurvey.votes = {};
            }
            if (data.concertSurvey && typeof data.concertSurvey === "object") {
                if (data.concertSurvey.basicInfo && data.concertSurvey.recruitmentAndActivity) {
                    s.concertSurvey = deepClone(data.concertSurvey);
                } else if (typeof initialAppState !== "undefined" && initialAppState.concertSurvey) {
                    s.concertSurvey = deepClone(initialAppState.concertSurvey);
                }
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
                s.election.totalVoters = (data.electionTotalVoters === 38) ? 0 : data.electionTotalVoters;
            }
            if (Array.isArray(data.electionCandidates)) {
                s.election.candidates = deepClone(data.electionCandidates).map(function(c) {
                    if (c && typeof c === "object") c.baseVotes = 0;
                    return c;
                });
                if (s.election.candidates.length > 0) {
                    var c0 = s.election.candidates[0];
                    if (c0.name === "이창욱" || (typeof c0.career === "string" && c0.career.indexOf("타 합창단") !== -1)) {
                        var defaultCand1 = (typeof getDefaultState === "function") ? getDefaultState().election.candidates[0] : null;
                        if (defaultCand1) s.election.candidates[0] = deepClone(defaultCand1);
                    }
                }
            }
            if (!s.election.singleVotes) {
                s.election.singleVotes = { approve: 0, reject: 0, abstain: 0, memberVotes: {} };
            }
            // Enforce strict 0 baseline votes regardless of legacy remote config
            s.election.singleVotes.approve = 0;
            s.election.singleVotes.reject = 0;
            s.election.singleVotes.abstain = 0;
            if (!s.election.singleVotes.memberVotes) s.election.singleVotes.memberVotes = {};
            if (!s.election.multiMemberVotes) s.election.multiMemberVotes = {};
            if (!s.election.memberVotes) {
                s.election.memberVotes = Object.assign({}, s.election.singleVotes.memberVotes, s.election.multiMemberVotes);
            }

            // 안건 메타데이터 병합 (기존 또는 클라우드 캐시된 memberVotes 보존)
            var remoteAgendasMeta = Array.isArray(data.agendasMeta) ? data.agendasMeta : [];
            var isRemoteAgendasStale = remoteAgendasMeta.length !== (typeof INITIAL_AGENDAS !== "undefined" ? INITIAL_AGENDAS.length : 5) ||
                remoteAgendasMeta.some(function(ag) {
                    return ag && ag.title && (
                        ag.title.indexOf("지휘자 임기") !== -1 ||
                        ag.title.indexOf("대외활동 수익") !== -1 ||
                        ag.title.indexOf("제3-1호") !== -1 ||
                        ag.title.indexOf("보궐선출") !== -1 ||
                        ag.title.indexOf("대외수익") !== -1 ||
                        ag.title.indexOf("12개") !== -1 ||
                        ag.title.indexOf("6개") !== -1
                    );
                }) ||
                !remoteAgendasMeta.some(function(ag) { return ag && (ag.id === "ag-1" || ag.no === 1) && String(ag.targetArticle || ag.title || "").indexOf("4조") !== -1; }) ||
                !remoteAgendasMeta.some(function(ag) { return ag && (ag.id === "ag-2" || ag.no === 2) && String(ag.targetArticle || ag.title || "").indexOf("11조") !== -1; }) ||
                !remoteAgendasMeta.some(function(ag) { return ag && (ag.id === "ag-3" || ag.no === 3) && String(ag.targetArticle || ag.title || "").indexOf("13조") !== -1; }) ||
                !remoteAgendasMeta.some(function(ag) { return ag && (ag.id === "ag-4" || ag.no === 4) && String(ag.targetArticle || ag.title || "").indexOf("22조") !== -1; }) ||
                !remoteAgendasMeta.some(function(ag) { return ag && (ag.id === "ag-5" || ag.no === 5) && String(ag.targetArticle || ag.title || "").indexOf("28조") !== -1; });
            if (isRemoteAgendasStale && typeof INITIAL_AGENDAS !== "undefined") {
                remoteAgendasMeta = INITIAL_AGENDAS;
                if (typeof global.saveStateToStorage === "function") {
                    setTimeout(function() {
                        global.saveStateToStorage({ skipCloudPush: false });
                    }, 800);
                }
            }

            if (remoteAgendasMeta.length > 0) {
                var existingVotesByAgenda = {};
                (s.agendas || []).forEach(function(ag) {
                    if (ag && ag.id) {
                        existingVotesByAgenda[ag.id] = ag.memberVotes || {};
                    }
                });

                s.agendas = remoteAgendasMeta.map(function(meta, idx) {
                    var agId = meta.id || ("ag-" + (idx + 1));
                    var locked = Boolean(meta.isLocked || meta.locked || meta.status === "closed" || meta.status === "locked");
                    var mergedVotes = Object.assign(
                        {},
                        existingVotesByAgenda[agId] || {},
                        cachedAgendaVotes[agId] || {}
                    );
                    var no = meta.no || meta.agendaNo || meta.number || (idx + 1);
                    var cleanTitle = String(meta.title || ("제" + no + "호 안건")).replace(/\s*\[가결\]\s*/g, " ").trim();
                    var agreeCnt = 0;
                    var disagreeCnt = 0;
                    var abstainCnt = 0;
                    Object.keys(mergedVotes).forEach(function(mk) {
                        if (mergedVotes[mk] === "approve") agreeCnt += 1;
                        else if (mergedVotes[mk] === "reject") disagreeCnt += 1;
                        else if (mergedVotes[mk] === "abstain") abstainCnt += 1;
                    });
                    var dynamicTotalAtt = (typeof s.totalAttendees === "number" && s.totalAttendees > 0) ? s.totalAttendees : 135;
                    return {
                        id: agId,
                        no: no,
                        agendaNo: meta.agendaNo || no,
                        number: meta.number || no,
                        title: cleanTitle,
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
                        baseApprove: 0,
                        baseReject: 0,
                        baseAbstain: 0,
                        agree: agreeCnt,
                        disagree: disagreeCnt,
                        abstain: abstainCnt,
                        voterTotal: 0,
                        passThreshold: Math.ceil((dynamicTotalAtt * 2) / 3),
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
            var newAttendanceVotes = {};
            var electionVotersMap = {};

            snapshot.forEach(function(doc) {
                var d = typeof doc.data === "function" ? doc.data() : doc;
                if (!d || typeof d !== "object") return;

                if (d.type === "agenda" && d.agendaId && d.memberKey && d.choice) {
                    if (!newAgendaVotes[d.agendaId]) {
                        newAgendaVotes[d.agendaId] = {};
                    }
                    newAgendaVotes[d.agendaId][d.memberKey] = d.choice;
                } else if (d.type === "attendance" && d.memberKey && d.choice) {
                    newAttendanceVotes[d.memberKey] = d.choice;
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
            cachedAttendanceVotes = newAttendanceVotes;
            if (!s.attendanceSurvey) s.attendanceSurvey = { votes: {} };
            if (!s.attendanceSurvey.votes) s.attendanceSurvey.votes = {};
            Object.assign(s.attendanceSurvey.votes, newAttendanceVotes);
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
                s.election.memberVotes = deepClone(electionVotersMap);
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
     * 단장 선거 개별 투표 취소(삭제): hanwoori_2026_votes/election_${safeMemberKey}
     */
    function deleteElectionVoteFromCloud(memberKey) {
        if (!memberKey) {
            return Promise.resolve({ skipped: true, reason: "invalid_args" });
        }
        if (cachedSingleElectionVotes[memberKey]) {
            delete cachedSingleElectionVotes[memberKey];
        }
        if (cachedMultiElectionVotes[memberKey]) {
            delete cachedMultiElectionVotes[memberKey];
        }
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        var safeMemberKey = sanitizeKey(memberKey);
        var docId = "election_" + safeMemberKey;
        return db.collection(VOTES_COLLECTION).doc(docId).delete()
            .then(function() {
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
     * 단칙 개정안(agenda_*) 투표 문서만 선택 삭제 후 클린 config 반영
     */
    function resetAgendaVotesInCloud() {
        cachedAgendaVotes = {};
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        return db.collection(VOTES_COLLECTION).get()
            .then(function(snapshot) {
                var deletions = [];
                if (snapshot && !snapshot.empty) {
                    snapshot.forEach(function(doc) {
                        var d = (doc && typeof doc.data === "function") ? doc.data() : null;
                        var docId = (doc && doc.id) ? String(doc.id) : "";
                        var isAgendaDoc = (docId.indexOf("agenda_") === 0) || (d && d.type === "agenda");
                        if (!isAgendaDoc) return;
                        if (doc && doc.ref && typeof doc.ref.delete === "function") {
                            deletions.push(doc.ref.delete());
                        } else if (docId) {
                            deletions.push(db.collection(VOTES_COLLECTION).doc(docId).delete());
                        }
                    });
                }
                return Promise.all(deletions).then(function() {
                    cachedAgendaVotes = {};
                    status.lastSyncAt = new Date().toISOString();
                    return pushConfigToCloud(getAppStateRef(), { force: true, immediate: true }).then(function() {
                        return { ok: true, deleted: deletions.length };
                    });
                });
            })
            .catch(function(err) {
                status.error = err && err.message ? err.message : String(err);
                notifyUiRefresh();
                return { ok: false, error: status.error };
            });
    }

    /**
     * 특정 단칙 개정안(agenda_${agendaId}_*) 투표 문서만 선택 삭제 후 클린 config 반영
     */
    function resetSingleAgendaVotesInCloud(agendaId) {
        if (!agendaId) {
            return Promise.resolve({ skipped: true, reason: "invalid_agenda_id" });
        }
        if (cachedAgendaVotes[agendaId]) {
            delete cachedAgendaVotes[agendaId];
        }
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        var targetPrefix = "agenda_" + sanitizeKey(agendaId) + "_";
        return db.collection(VOTES_COLLECTION).get()
            .then(function(snapshot) {
                var deletions = [];
                if (snapshot && !snapshot.empty) {
                    snapshot.forEach(function(doc) {
                        var d = (doc && typeof doc.data === "function") ? doc.data() : null;
                        var docId = (doc && doc.id) ? String(doc.id) : "";
                        var isTargetDoc = (docId.indexOf(targetPrefix) === 0) || (d && d.type === "agenda" && (d.agendaId === agendaId || d.agendaNo === agendaId));
                        if (!isTargetDoc) return;
                        if (doc && doc.ref && typeof doc.ref.delete === "function") {
                            deletions.push(doc.ref.delete());
                        } else if (docId) {
                            deletions.push(db.collection(VOTES_COLLECTION).doc(docId).delete());
                        }
                    });
                }
                return Promise.all(deletions).then(function() {
                    status.lastSyncAt = new Date().toISOString();
                    return pushConfigToCloud(getAppStateRef(), { force: true, immediate: true }).then(function() {
                        return { ok: true, deleted: deletions.length };
                    });
                });
            })
            .catch(function(err) {
                status.error = err && err.message ? err.message : String(err);
                notifyUiRefresh();
                return { ok: false, error: status.error };
            });
    }

    /**
     * 단장 선거(election_*) 투표 문서만 선택 삭제 후 클린 config 반영
     */
    function resetElectionVotesInCloud() {
        cachedSingleElectionVotes = {};
        cachedMultiElectionVotes = {};
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        return db.collection(VOTES_COLLECTION).get()
            .then(function(snapshot) {
                var deletions = [];
                if (snapshot && !snapshot.empty) {
                    snapshot.forEach(function(doc) {
                        var d = (doc && typeof doc.data === "function") ? doc.data() : null;
                        var docId = (doc && doc.id) ? String(doc.id) : "";
                        var isElectionDoc = (docId.indexOf("election_") === 0) || (d && d.type === "election");
                        if (!isElectionDoc) return;
                        if (doc && doc.ref && typeof doc.ref.delete === "function") {
                            deletions.push(doc.ref.delete());
                        } else if (docId) {
                            deletions.push(db.collection(VOTES_COLLECTION).doc(docId).delete());
                        }
                    });
                }
                return Promise.all(deletions).then(function() {
                    cachedSingleElectionVotes = {};
                    cachedMultiElectionVotes = {};
                    status.lastSyncAt = new Date().toISOString();
                    return pushConfigToCloud(getAppStateRef(), { force: true, immediate: true }).then(function() {
                        return { ok: true, deleted: deletions.length };
                    });
                });
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

        function pushAttendanceVoteToCloud(memberKey, choice) {
        if (!db || status.mode !== "cloud") {
            return Promise.resolve({ skipped: true, reason: "local_mode" });
        }
        var safeKey = sanitizeKey(memberKey);
        var docId = "attendance_" + safeKey;
        var votesRef = db.collection(VOTES_COLLECTION);
        return votesRef.doc(docId).set({
            type: "attendance",
            memberKey: String(memberKey),
            choice: String(choice),
            updatedAt: new Date().toISOString()
        });
    }
    global.pushAttendanceVoteToCloud = pushAttendanceVoteToCloud;

    global.FirebaseSync = {
        init: init,
        pushConfigToCloud: pushConfigToCloud,
        submitAgendaVoteToCloud: submitAgendaVoteToCloud,
        deleteAgendaVoteFromCloud: deleteAgendaVoteFromCloud,
        submitElectionVoteToCloud: submitElectionVoteToCloud,
        deleteElectionVoteFromCloud: deleteElectionVoteFromCloud,
        resetAgendaVotesInCloud: resetAgendaVotesInCloud,
        resetSingleAgendaVotesInCloud: resetSingleAgendaVotesInCloud,
        resetElectionVotesInCloud: resetElectionVotesInCloud,
        resetVotesInCloud: resetVotesInCloud,
        getStatus: getStatus,
        isApplyingRemote: isApplyingRemote
    };
})(typeof window !== "undefined" ? window : globalThis);
