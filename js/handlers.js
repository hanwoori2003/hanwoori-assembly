// 5. 이벤트 핸들러, 모달 제어, 투표 제출 및 엑셀/백업 내보내기 모듈 (js/handlers.js)

function switchMainTab(tabId, btnEl) {
    if (!tabId) return;

    // Support both canonical and legacy alias names
    const tabAliasMap = {
        "settlement": "settlement",
        "finance": "settlement",
        "voting": "voting",
        "rules": "voting",
        "bylaws": "bylaws",
        "viewRules": "bylaws",
        "search": "bylaws",
        "events": "events",
        "concert": "concert",
        "election": "election",
        "winner": "winner",
        "admin": "admin"
    };

    const canonicalTab = tabAliasMap[tabId] || tabId;
    appState.activeTab = canonicalTab;
    
    // Hide all view panels (canonical + legacy aliases)
    const views = [
        "events",
        "concert",
        "settlement",
        "voting",
        "election",
        "bylaws",
        "search",
        "winner",
        "admin",
        "finance",
        "rules",
        "viewRules"
    ];
    views.forEach(function(v) {
        const el = document.getElementById("view-" + v);
        if (el) el.classList.add("hidden");
    });

    // Show target view panel (checks canonical ID first, falls back to raw or alias)
    let targetEl = document.getElementById("view-" + canonicalTab) ||
                   document.getElementById("view-" + tabId);
    if (!targetEl) {
        if (canonicalTab === "settlement") targetEl = document.getElementById("view-finance");
        else if (canonicalTab === "voting") targetEl = document.getElementById("view-rules");
        else if (canonicalTab === "bylaws") targetEl = document.getElementById("view-viewRules");
    }
    if (targetEl) targetEl.classList.remove("hidden");

    // Update active tab button styles
    const tabBtns = document.querySelectorAll(".main-tab-btn");
    tabBtns.forEach(function(b) {
        b.classList.remove("bg-indigo-600", "text-white", "font-bold", "shadow-sm");
        if (b.id === "tabBtn-winner") {
            b.classList.add("text-amber-300");
        } else if (b.id === "tabBtn-admin") {
            b.classList.add("text-rose-300");
        } else {
            b.classList.add("text-slate-300");
        }
    });

    let activeBtn = btnEl ||
                    document.getElementById("tabBtn-" + canonicalTab) ||
                    document.getElementById("tabBtn-" + tabId);
    if (!activeBtn) {
        if (canonicalTab === "settlement") activeBtn = document.getElementById("tabBtn-finance");
        else if (canonicalTab === "voting") activeBtn = document.getElementById("tabBtn-rules");
        else if (canonicalTab === "bylaws") activeBtn = document.getElementById("tabBtn-viewRules");
    }
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-300", "text-amber-300", "text-rose-300");
        activeBtn.classList.add("bg-indigo-600", "text-white", "font-bold", "shadow-sm");
    }

    if (tabId === "search") {
        setTimeout(function() {
            const searchInput = document.querySelector("#view-bylaws input[type='text']") ||
                                document.querySelector("#view-viewRules input[type='text']") ||
                                document.querySelector("input[placeholder*='단칙 키워드']");
            if (searchInput) searchInput.focus();
        }, 50);
    }

    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function openAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    appState.authModalFilter = "all";
    appState.authModalSearch = "";
    const inp = document.getElementById("inputAuthSearch");
    if (inp) inp.value = "";
    const box = document.getElementById("execPasswordAuthBox");
    if (box) box.classList.add("hidden");
    renderAuthModalMemberList();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    const box = document.getElementById("execPasswordAuthBox");
    if (box) box.classList.add("hidden");
}

function setAuthModalFilter(k) {
    appState.authModalFilter = k;
    renderAuthModalMemberList();
}

function handleAuthSearchInput(e) {
    appState.authModalSearch = e.target.value;
    renderAuthModalMemberList();
}

function selectVoter(memberId) {
    const m = appState.members.find(function(x) { return x.id === memberId; });
    if (!m) return;

    pendingExecMemberId = m.id;
    const box = document.getElementById("execPasswordAuthBox");
    const label = document.getElementById("execAuthTargetLabel");
    const inp = document.getElementById("inputExecPassword");
    const err = document.getElementById("execPasswordErrorMsg");

    if (label) {
        label.textContent = m.name + " (" + m.basePart + ") 단원 본인 확인 — 휴대폰 뒷 4자리 입력";
    }
    if (err) err.classList.add("hidden");
    if (box) box.classList.remove("hidden");
    if (inp) {
        inp.placeholder = "본인 확인용 휴대폰 뒷 4자리를 입력하세요";
        inp.value = "";
        setTimeout(function() { inp.focus(); }, 60);
    }
}

function confirmExecPasswordLogin() {
    const inp = document.getElementById("inputExecPassword");
    const err = document.getElementById("execPasswordErrorMsg");
    const entered = (inp ? inp.value : "").trim();

    const m = appState.members.find(function(x) { return x.id === pendingExecMemberId; });
    if (!m) return;

    // 인증 번호 검증:
    // 일반 단원: 오직 본인의 고유 4자리 휴대폰 뒷자리 코드만 일치해야 로그인 허용 (마스터 암호 2003 불허)
    // 운영진 단원: 본인의 휴대폰 뒷 4자리 또는 운영진 마스터 암호(2003) 모두 허용
    const memberCode = String(m.code || "").trim();
    const isCodeMatch = Boolean(memberCode && entered === memberCode);
    const isMasterAdminMatch = Boolean(m.isExecutive && entered === ADMIN_PASSWORD_CODE);
    const isValid = isCodeMatch || isMasterAdminMatch;

    if (!isValid) {
        if (err) {
            err.textContent = m.isExecutive
                ? "✕ 인증번호가 일치하지 않습니다. 휴대폰 뒷 4자리 또는 운영진 암호(2003)를 입력해 주세요."
                : "✕ 인증번호가 일치하지 않습니다. 본인 확인용 휴대폰 뒷 4자리를 정확히 입력해 주세요.";
            err.classList.remove("hidden");
        }
        showToast("인증번호가 일치하지 않습니다.");
        return;
    }

    appState.currentVoterId = m.id;
    // 운영진인 경우 관리자 권한 부여
    appState.isAdminAuthenticated = Boolean(m.isExecutive);
    pendingExecMemberId = null;

    closeAuthModal();
    saveStateToStorage();
    renderAll();
    showToast(m.name + " (" + m.basePart + ") 단원으로 로그인되었습니다.");
}

function toggleProjectorMode() {
    appState.projectorMode = !appState.projectorMode;
    if (appState.projectorMode) {
        document.body.classList.add("projector-mode");
        showToast("📽 프로젝터 대형화면 모드가 활성화되었습니다.");
    } else {
        document.body.classList.remove("projector-mode");
        showToast("기본 화면 모드로 복원되었습니다.");
    }
}

function voteAgenda(choice) {
    const ag = getActiveAgenda();
    if (!ag) return;
    if (!ag.memberVotes) ag.memberVotes = {};

    ag.memberVotes[appState.currentVoterId] = choice;
    saveStateToStorage();
    renderActiveVotingView();
    renderAgendaStepper();
    renderHeaderStatus();
    const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
    showToast("안건 " + ag.no + "에 [" + labelMap[choice] + "] 투표를 완료했습니다.");
}

function selectAgenda(agendaId) {
    appState.activeAgendaId = agendaId;
    renderAgendaStepper();
    renderActiveVotingView();
    renderHeaderStatus();
}

function voteElectionSingle(choice) {
    const elec = appState.election;
    if (!elec || !elec.singleVotes) return;
    if (!elec.singleVotes.memberVotes) elec.singleVotes.memberVotes = {};

    elec.singleVotes.memberVotes[appState.currentVoterId] = choice;
    saveStateToStorage();
    renderElectionView();
    const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
    showToast("신임 단장 후보에 [" + labelMap[choice] + "] 투표를 완료했습니다.");
}

function voteElectionMulti(candId) {
    const elec = appState.election;
    if (!elec) return;
    if (!elec.multiMemberVotes) elec.multiMemberVotes = {};

    elec.multiMemberVotes[appState.currentVoterId] = candId;
    saveStateToStorage();
    renderElectionView();
    const cand = elec.candidates.find(function(c) { return c.id === candId; });
    showToast((cand ? cand.name : "후보자") + "에게 투표를 완료했습니다.");
}

function openCloudSyncModal() {
    const modal = document.getElementById("cloudSyncModal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
}

function closeCloudSyncModal() {
    const modal = document.getElementById("cloudSyncModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

// ============================================================================
// 6. 식순 관리 모달 및 CRUD 핸들러
// ============================================================================

function openScheduleModal(scheduleId) {
    const modal = document.getElementById("scheduleModal");
    if (!modal) return;
    const titleEl = document.getElementById("scheduleModalTitle");
    const idInp = document.getElementById("inputScheduleId");
    const titleInp = document.getElementById("inputScheduleTitle");
    const descInp = document.getElementById("inputScheduleDesc");
    const statusSel = document.getElementById("selectScheduleStatus");
    const btnLabelInp = document.getElementById("inputScheduleBtnLabel");
    const targetTabSel = document.getElementById("selectScheduleTargetTab");
    const delBtn = document.getElementById("btnDeleteSchedule");

    if (scheduleId) {
        const item = (appState.assemblySchedule || []).find(function(s) { return s.id === scheduleId; });
        if (item) {
            if (titleEl) titleEl.textContent = "식순 항목 수정";
            if (idInp) idInp.value = item.id;
            if (titleInp) titleInp.value = item.title || "";
            if (descInp) descInp.value = item.desc || "";
            if (statusSel) statusSel.value = item.status || "안건상정";
            if (btnLabelInp) btnLabelInp.value = item.btnLabel || "";
            if (targetTabSel) targetTabSel.value = item.targetTab || "";
            if (delBtn) delBtn.classList.remove("hidden");
        }
    } else {
        if (titleEl) titleEl.textContent = "식순 항목 추가";
        if (idInp) idInp.value = "";
        const nextNo = (appState.assemblySchedule || []).length + 1;
        if (titleInp) titleInp.value = nextNo + ". ";
        if (descInp) descInp.value = "";
        if (statusSel) statusSel.value = "안건상정";
        if (btnLabelInp) btnLabelInp.value = "이동 ->";
        if (targetTabSel) targetTabSel.value = "";
        if (delBtn) delBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    if (titleInp) setTimeout(function() { titleInp.focus(); }, 60);
}

function closeScheduleModal() {
    const modal = document.getElementById("scheduleModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveScheduleModalItem() {
    const id = (document.getElementById("inputScheduleId") ? document.getElementById("inputScheduleId").value : "").trim();
    const title = (document.getElementById("inputScheduleTitle") ? document.getElementById("inputScheduleTitle").value : "").trim();
    const desc = (document.getElementById("inputScheduleDesc") ? document.getElementById("inputScheduleDesc").value : "").trim();
    const status = (document.getElementById("selectScheduleStatus") ? document.getElementById("selectScheduleStatus").value : "안건상정");
    const btnLabel = (document.getElementById("inputScheduleBtnLabel") ? document.getElementById("inputScheduleBtnLabel").value : "").trim();
    const targetTab = (document.getElementById("selectScheduleTargetTab") ? document.getElementById("selectScheduleTargetTab").value : "").trim();

    if (!title) {
        showToast("식순 제목을 입력해 주세요.");
        return;
    }

    if (!Array.isArray(appState.assemblySchedule)) {
        appState.assemblySchedule = [];
    }

    if (id) {
        const item = appState.assemblySchedule.find(function(s) { return s.id === id; });
        if (item) {
            item.title = title;
            item.desc = desc;
            item.status = status;
            item.btnLabel = btnLabel;
            item.targetTab = targetTab;
            showToast("식순 항목이 수정되었습니다.");
        }
    } else {
        const newId = "sch-" + Date.now();
        appState.assemblySchedule.push({
            id: newId,
            title: title,
            desc: desc,
            status: status,
            btnLabel: btnLabel,
            targetTab: targetTab
        });
        showToast("새 식순 항목이 추가되었습니다.");
    }

    closeScheduleModal();
    saveStateToStorage();
    renderAll();
}

function deleteScheduleModalItem() {
    const id = (document.getElementById("inputScheduleId") ? document.getElementById("inputScheduleId").value : "").trim();
    if (!id) return;
    deleteScheduleItem(id);
    closeScheduleModal();
}

function deleteScheduleItem(id) {
    if (!id) return;
    const item = (appState.assemblySchedule || []).find(function(s) { return s.id === id; });
    const name = item ? item.title : "식순 항목";
    if (!confirm("정말 '" + name + "' 항목을 삭제하시겠습니까?")) return;
    appState.assemblySchedule = (appState.assemblySchedule || []).filter(function(s) { return s.id !== id; });
    saveStateToStorage();
    renderAll();
    showToast("식순 항목이 삭제되었습니다.");
}

// ============================================================================
// 7. 연간 행사 관리 모달 및 CRUD 핸들러
// ============================================================================

function openEditEventModal(eventId) {
    openEventModal(eventId);
}

function openEventModal(eventId) {
    const modal = document.getElementById("addEventModal");
    if (!modal) return;
    const titleEl = document.getElementById("eventModalTitle");
    const idInp = document.getElementById("inputEventId");
    const titleInp = document.getElementById("inputEventTitle");
    const dateInp = document.getElementById("inputEventDate");
    const placeInp = document.getElementById("inputEventPlace");
    const descInp = document.getElementById("inputEventDesc");
    const delBtn = document.getElementById("btnDeleteEvent");

    if (eventId) {
        const item = (appState.events || []).find(function(e) { return e.id === eventId; });
        if (item) {
            if (titleEl) titleEl.textContent = "연간 행사 수정";
            if (idInp) idInp.value = item.id;
            if (titleInp) titleInp.value = item.title || "";
            if (dateInp) dateInp.value = item.date || "";
            if (placeInp) placeInp.value = item.place || "";
            if (descInp) descInp.value = item.desc || "";
            if (delBtn) delBtn.classList.remove("hidden");
        }
    } else {
        if (titleEl) titleEl.textContent = "연간 행사 추가";
        if (idInp) idInp.value = "";
        if (titleInp) titleInp.value = "";
        if (dateInp) dateInp.value = "2026년 ";
        if (placeInp) placeInp.value = "";
        if (descInp) descInp.value = "";
        if (delBtn) delBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    if (titleInp) setTimeout(function() { titleInp.focus(); }, 60);
}

function closeEventModal() {
    const modal = document.getElementById("addEventModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveEventModalItem() {
    const id = (document.getElementById("inputEventId") ? document.getElementById("inputEventId").value : "").trim();
    const title = (document.getElementById("inputEventTitle") ? document.getElementById("inputEventTitle").value : "").trim();
    const date = (document.getElementById("inputEventDate") ? document.getElementById("inputEventDate").value : "").trim();
    const place = (document.getElementById("inputEventPlace") ? document.getElementById("inputEventPlace").value : "").trim();
    const desc = (document.getElementById("inputEventDesc") ? document.getElementById("inputEventDesc").value : "").trim();

    if (!title) {
        showToast("행사명을 입력해 주세요.");
        return;
    }

    if (!Array.isArray(appState.events)) {
        appState.events = [];
    }

    if (id) {
        const item = appState.events.find(function(e) { return e.id === id; });
        if (item) {
            item.title = title;
            item.date = date;
            item.place = place;
            item.desc = desc;
            showToast("행사 정보가 수정되었습니다.");
        }
    } else {
        const newId = "ev-" + Date.now();
        appState.events.push({
            id: newId,
            title: title,
            date: date,
            place: place,
            desc: desc
        });
        showToast("새 행사가 추가되었습니다.");
    }

    closeEventModal();
    saveStateToStorage();
    renderAll();
}

function deleteEventModalItem() {
    const id = (document.getElementById("inputEventId") ? document.getElementById("inputEventId").value : "").trim();
    if (!id) return;
    deleteEventItem(id);
    closeEventModal();
}

function deleteEventItem(id) {
    if (!id) return;
    const item = (appState.events || []).find(function(e) { return e.id === id; });
    const name = item ? item.title : "행사";
    if (!confirm("정말 '" + name + "' 행사를 삭제하시겠습니까?")) return;
    appState.events = (appState.events || []).filter(function(e) { return e.id !== id; });
    saveStateToStorage();
    renderAll();
    showToast("행사 내역이 삭제되었습니다.");
}

// ============================================================================
// 8. 단칙 조문 관리 모달 및 CRUD 핸들러
// ============================================================================

function openEditClauseModal(clauseId) {
    openClauseModal(clauseId);
}

function openClauseModal(clauseId) {
    const modal = document.getElementById("editClauseModal");
    if (!modal) return;
    const titleEl = document.getElementById("clauseModalTitle");
    const idInp = document.getElementById("inputClauseId");
    const chInp = document.getElementById("inputClauseChapter");
    const artInp = document.getElementById("inputClauseArticleNo");
    const titleInp = document.getElementById("inputClauseTitle");
    const contentInp = document.getElementById("inputClauseContent");
    const amendInp = document.getElementById("inputClauseLastAmended");
    const kwInp = document.getElementById("inputClauseKeywords");
    const delBtn = document.getElementById("btnDeleteClause");

    if (clauseId) {
        const item = (appState.bylaws || []).find(function(c) { return c.id === clauseId; });
        if (item) {
            if (titleEl) titleEl.textContent = "단칙 조문 수정 (" + (item.articleNo || "") + ")";
            if (idInp) idInp.value = item.id;
            if (chInp) chInp.value = item.chapter || "";
            if (artInp) artInp.value = item.articleNo || "";
            if (titleInp) titleInp.value = item.title || "";
            if (contentInp) contentInp.value = item.content || "";
            if (amendInp) amendInp.value = item.lastAmended || "";
            if (kwInp) kwInp.value = Array.isArray(item.keywords) ? item.keywords.join(", ") : (item.keywords || "");
            if (delBtn) delBtn.classList.remove("hidden");
        }
    } else {
        if (titleEl) titleEl.textContent = "단칙 신규 조문 추가";
        if (idInp) idInp.value = "";
        if (chInp) chInp.value = "제1장 총 칙";
        const nextArt = (appState.bylaws || []).length + 1;
        if (artInp) artInp.value = "제" + nextArt + "조";
        if (titleInp) titleInp.value = "";
        if (contentInp) contentInp.value = "";
        if (amendInp) amendInp.value = "2026.02.21 신설";
        if (kwInp) kwInp.value = "";
        if (delBtn) delBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    if (artInp) setTimeout(function() { artInp.focus(); }, 60);
}

function closeClauseModal() {
    const modal = document.getElementById("editClauseModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveClauseModalItem() {
    const id = (document.getElementById("inputClauseId") ? document.getElementById("inputClauseId").value : "").trim();
    const chapter = (document.getElementById("inputClauseChapter") ? document.getElementById("inputClauseChapter").value : "").trim();
    const articleNo = (document.getElementById("inputClauseArticleNo") ? document.getElementById("inputClauseArticleNo").value : "").trim();
    const title = (document.getElementById("inputClauseTitle") ? document.getElementById("inputClauseTitle").value : "").trim();
    const content = (document.getElementById("inputClauseContent") ? document.getElementById("inputClauseContent").value : "").trim();
    const lastAmended = (document.getElementById("inputClauseLastAmended") ? document.getElementById("inputClauseLastAmended").value : "").trim();
    const kwRaw = (document.getElementById("inputClauseKeywords") ? document.getElementById("inputClauseKeywords").value : "").trim();
    const keywords = kwRaw ? kwRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [articleNo, title];

    if (!articleNo || !title || !content) {
        showToast("조항 번호, 제목, 본문 내용을 모두 입력해 주세요.");
        return;
    }

    if (!Array.isArray(appState.bylaws)) {
        appState.bylaws = [];
    }

    if (id) {
        const item = appState.bylaws.find(function(c) { return c.id === id; });
        if (item) {
            item.chapter = chapter || item.chapter || "제1장 총 칙";
            item.articleNo = articleNo;
            item.title = title;
            item.content = content;
            item.lastAmended = lastAmended;
            item.keywords = keywords;
            showToast(articleNo + " (" + title + ") 조문이 수정되었습니다.");
        }
    } else {
        const newId = "cl-" + Date.now();
        appState.bylaws.push({
            id: newId,
            chapter: chapter || "제1장 총 칙",
            articleNo: articleNo,
            title: title,
            content: content,
            lastAmended: lastAmended,
            keywords: keywords
        });
        showToast(articleNo + " (" + title + ") 조문이 신규 추가되었습니다.");
    }

    closeClauseModal();
    saveStateToStorage();
    renderAll();
}

function deleteClauseModalItem() {
    const id = (document.getElementById("inputClauseId") ? document.getElementById("inputClauseId").value : "").trim();
    if (!id) return;
    deleteClauseItem(id);
    closeClauseModal();
}

function deleteClauseItem(id) {
    if (!id) return;
    const cl = (appState.bylaws || []).find(function(c) { return c.id === id; });
    const name = cl ? (cl.articleNo + " " + cl.title) : "조문";
    if (!confirm("정말 " + name + "을(를) 단칙에서 삭제하시겠습니까?")) return;
    appState.bylaws = (appState.bylaws || []).filter(function(c) { return c.id !== id; });
    saveStateToStorage();
    renderAll();
    showToast(name + " 조문이 삭제되었습니다.");
}

// ============================================================================
// 9. 내보내기 및 데이터 백업 핸들러
// ============================================================================


// ============================================================================
// ELECTION ADMIN CONTROLS (단장 선거 방식 전환, 상태 제어, 당선공고 토글)
// ============================================================================

function setElectionMode(mode) {
    if (!appState.election) appState.election = {};
    appState.election.mode = mode;
    saveStateToStorage();
    renderAll();
    showToast("선거 방식이 [" + (mode === "single" ? "단독 출마 찬반투표" : "다자 경선 투표") + "]로 변경되었습니다.");
}

function toggleElectionStatus() {
    if (!appState.election) appState.election = {};
    const isCurrentlyClosed = appState.election.status === "closed";
    appState.election.status = isCurrentlyClosed ? "in_progress" : "closed";
    saveStateToStorage();
    renderAll();
    showToast("선거 상태가 [" + (appState.election.status === "closed" ? "투표 마감 및 결과 확정" : "투표 진행중") + "]으로 전환되었습니다.");
}

function toggleWinnerPublic() {
    appState.winnerPagePublic = !appState.winnerPagePublic;
    saveStateToStorage();
    renderAll();
    showToast("당선 공고 페이지가 [" + (appState.winnerPagePublic ? "전체 공개" : "비공개 (운영진 전용)") + "]로 전환되었습니다.");
}

// ============================================================================
// CANDIDATE MODAL CRUD (단장 후보자 추가 / 수정 / 삭제)
// ============================================================================

function openCandidateModal(candId) {
    const modal = document.getElementById("candidateModal");
    if (!modal) return;
    const titleEl = document.getElementById("candidateModalTitle");
    const idInp = document.getElementById("inputCandidateId");
    const nameInp = document.getElementById("inputCandidateName");
    const genInp = document.getElementById("inputCandidateGen");
    const partInp = document.getElementById("inputCandidatePart");
    const compInp = document.getElementById("inputCandidateCompany");
    const titleInp = document.getElementById("inputCandidateTitle");
    const photoInp = document.getElementById("inputCandidatePhoto");
    const pledgeInp = document.getElementById("inputCandidatePledge");
    const careerInp = document.getElementById("inputCandidateCareer");
    const delBtn = document.getElementById("btnDeleteCandidate");

    if (candId) {
        const item = (appState.election.candidates || []).find(function(c) { return c.id === candId; });
        if (item) {
            if (titleEl) titleEl.textContent = "후보자 정보 수정 (" + item.name + ")";
            if (idInp) idInp.value = item.id;
            if (nameInp) nameInp.value = item.name || "";
            if (genInp) genInp.value = item.gen || "";
            if (partInp) partInp.value = item.part || "";
            if (compInp) compInp.value = item.company || "";
            if (titleInp) titleInp.value = item.title || "";
            if (photoInp) photoInp.value = item.photo || "assets/cand_1.jpg";
            if (pledgeInp) pledgeInp.value = item.pledge || "";
            if (careerInp) careerInp.value = item.career || "";
            if (delBtn) delBtn.classList.remove("hidden");
        }
    } else {
        if (titleEl) titleEl.textContent = "단장 후보자 신규 추가";
        if (idInp) idInp.value = "";
        if (nameInp) nameInp.value = "";
        if (genInp) genInp.value = "17기";
        if (partInp) partInp.value = "테너";
        if (compInp) compInp.value = "삼성전자";
        if (titleInp) titleInp.value = "2026 한우리 신임 단장 후보";
        if (photoInp) photoInp.value = "assets/cand_1.jpg";
        if (pledgeInp) pledgeInp.value = "";
        if (careerInp) careerInp.value = "";
        if (delBtn) delBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    if (nameInp) setTimeout(function() { nameInp.focus(); }, 60);
}

function closeCandidateModal() {
    const modal = document.getElementById("candidateModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveCandidateModal() {
    const id = (document.getElementById("inputCandidateId") ? document.getElementById("inputCandidateId").value : "").trim();
    const name = (document.getElementById("inputCandidateName") ? document.getElementById("inputCandidateName").value : "").trim();
    const gen = (document.getElementById("inputCandidateGen") ? document.getElementById("inputCandidateGen").value : "").trim();
    const part = (document.getElementById("inputCandidatePart") ? document.getElementById("inputCandidatePart").value : "").trim();
    const company = (document.getElementById("inputCandidateCompany") ? document.getElementById("inputCandidateCompany").value : "").trim();
    const title = (document.getElementById("inputCandidateTitle") ? document.getElementById("inputCandidateTitle").value : "").trim();
    const photo = (document.getElementById("inputCandidatePhoto") ? document.getElementById("inputCandidatePhoto").value : "").trim() || "assets/cand_1.jpg";
    const pledge = (document.getElementById("inputCandidatePledge") ? document.getElementById("inputCandidatePledge").value : "").trim();
    const career = (document.getElementById("inputCandidateCareer") ? document.getElementById("inputCandidateCareer").value : "").trim();

    if (!name) {
        showToast("후보자 이름을 입력해 주세요.");
        return;
    }

    if (!appState.election) appState.election = {};
    if (!Array.isArray(appState.election.candidates)) {
        appState.election.candidates = [];
    }

    if (id) {
        const item = appState.election.candidates.find(function(c) { return c.id === id; });
        if (item) {
            item.name = name;
            item.gen = gen;
            item.part = part;
            item.company = company;
            item.title = title;
            item.photo = photo;
            item.pledge = pledge;
            item.career = career;
            showToast("후보자 정보가 성공적으로 수정되었습니다.");
        }
    } else {
        const newId = "cand-" + Date.now();
        appState.election.candidates.push({
            id: newId,
            name: name,
            gen: gen,
            part: part,
            company: company,
            title: title,
            photo: photo,
            baseVotes: 0,
            pledge: pledge,
            career: career
        });
        showToast("새 후보자가 등록되었습니다.");
    }

    closeCandidateModal();
    saveStateToStorage();
    renderAll();
}

function deleteCandidateModalItem() {
    const id = (document.getElementById("inputCandidateId") ? document.getElementById("inputCandidateId").value : "").trim();
    if (!id) return;
    deleteCandidate(id);
    closeCandidateModal();
}

function deleteCandidate(id) {
    if (!id) return;
    if (!appState.election || !Array.isArray(appState.election.candidates)) return;
    const cand = appState.election.candidates.find(function(c) { return c.id === id; });
    const name = cand ? cand.name : "후보자";
    if (!confirm("정말 '" + name + "' 후보자를 삭제하시겠습니까?")) return;
    appState.election.candidates = appState.election.candidates.filter(function(c) { return c.id !== id; });
    saveStateToStorage();
    renderAll();
    showToast("'" + name + "' 후보자가 삭제되었습니다.");
}

// ============================================================================
// AGENDA MODAL CRUD (단칙 개정안 추가 / 수정 / 삭제)
// ============================================================================

function openAgendaModal(agendaId) {
    const modal = document.getElementById("agendaModal");
    if (!modal) return;
    const titleEl = document.getElementById("agendaModalTitle");
    const idInp = document.getElementById("inputAgendaId");
    const noInp = document.getElementById("inputAgendaNo");
    const catInp = document.getElementById("inputAgendaCategory");
    const authorInp = document.getElementById("inputAgendaAuthor");
    const titleInp = document.getElementById("inputAgendaTitle");
    const summaryInp = document.getElementById("inputAgendaSummary");
    const reasonInp = document.getElementById("inputAgendaReason");
    const beforeInp = document.getElementById("inputAgendaBefore");
    const afterInp = document.getElementById("inputAgendaAfter");
    const delBtn = document.getElementById("btnDeleteAgenda");

    if (agendaId) {
        const item = (appState.agendas || []).find(function(a) { return a.id === agendaId; });
        if (item) {
            if (titleEl) titleEl.textContent = "단칙 개정안 수정 (안건 " + item.no + ")";
            if (idInp) idInp.value = item.id;
            if (noInp) noInp.value = item.no || "";
            if (catInp) catInp.value = item.category || "";
            if (authorInp) authorInp.value = item.author || "";
            if (titleInp) titleInp.value = item.title || "";
            if (summaryInp) summaryInp.value = item.summary || "";
            if (reasonInp) reasonInp.value = item.proposalReason || "";
            if (beforeInp) beforeInp.value = item.beforeText || "";
            if (afterInp) afterInp.value = item.afterText || "";
            if (delBtn) delBtn.classList.remove("hidden");
        }
    } else {
        if (titleEl) titleEl.textContent = "단칙 개정안 신규 상정";
        if (idInp) idInp.value = "";
        const nextNo = (appState.agendas || []).length + 1;
        if (noInp) noInp.value = String(nextNo);
        if (catInp) catInp.value = "운영체계";
        if (authorInp) authorInp.value = "운영진 발의";
        if (titleInp) titleInp.value = "";
        if (summaryInp) summaryInp.value = "";
        if (reasonInp) reasonInp.value = "";
        if (beforeInp) beforeInp.value = "해당 조항 없음 (신설)";
        if (afterInp) afterInp.value = "";
        if (delBtn) delBtn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    if (titleInp) setTimeout(function() { titleInp.focus(); }, 60);
}

function closeAgendaModal() {
    const modal = document.getElementById("agendaModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveAgendaModal() {
    const id = (document.getElementById("inputAgendaId") ? document.getElementById("inputAgendaId").value : "").trim();
    const no = (document.getElementById("inputAgendaNo") ? document.getElementById("inputAgendaNo").value : "").trim();
    const category = (document.getElementById("inputAgendaCategory") ? document.getElementById("inputAgendaCategory").value : "").trim();
    const author = (document.getElementById("inputAgendaAuthor") ? document.getElementById("inputAgendaAuthor").value : "").trim();
    const title = (document.getElementById("inputAgendaTitle") ? document.getElementById("inputAgendaTitle").value : "").trim();
    const summary = (document.getElementById("inputAgendaSummary") ? document.getElementById("inputAgendaSummary").value : "").trim();
    const proposalReason = (document.getElementById("inputAgendaReason") ? document.getElementById("inputAgendaReason").value : "").trim();
    const beforeText = (document.getElementById("inputAgendaBefore") ? document.getElementById("inputAgendaBefore").value : "").trim();
    const afterText = (document.getElementById("inputAgendaAfter") ? document.getElementById("inputAgendaAfter").value : "").trim();

    if (!title) {
        showToast("안건 제목을 입력해 주세요.");
        return;
    }

    if (!Array.isArray(appState.agendas)) {
        appState.agendas = [];
    }

    if (id) {
        const item = appState.agendas.find(function(a) { return a.id === id; });
        if (item) {
            item.no = no || item.no;
            item.category = category;
            item.author = author;
            item.title = title;
            item.summary = summary;
            item.proposalReason = proposalReason;
            item.beforeText = beforeText;
            item.afterText = afterText;
            showToast("안건 " + item.no + "이(가) 수정되었습니다.");
        }
    } else {
        const newId = "ag-" + Date.now();
        const newAg = {
            id: newId,
            no: no || String(appState.agendas.length + 1),
            title: title,
            category: category || "운영체계",
            author: author || "운영진 발의",
            summary: summary,
            proposalReason: proposalReason,
            beforeText: beforeText,
            afterText: afterText,
            baseApprove: 0,
            baseReject: 0,
            baseAbstain: 0,
            memberVotes: {}
        };
        appState.agendas.push(newAg);
        appState.activeAgendaId = newId;
        showToast("새 단칙 개정안(안건 " + newAg.no + ")이 상정되었습니다.");
    }

    closeAgendaModal();
    saveStateToStorage();
    renderAll();
}

function deleteAgendaModalItem() {
    const id = (document.getElementById("inputAgendaId") ? document.getElementById("inputAgendaId").value : "").trim();
    if (!id) return;
    deleteAgenda(id);
    closeAgendaModal();
}

function deleteAgenda(id) {
    if (!id) return;
    if (!Array.isArray(appState.agendas) || appState.agendas.length <= 1) {
        showToast("최소 1개 이상의 안건이 유지되어야 합니다.");
        return;
    }
    const ag = appState.agendas.find(function(a) { return a.id === id; });
    const name = ag ? ("안건 " + ag.no + " (" + ag.title + ")") : "안건";
    if (!confirm("정말 " + name + "을(를) 삭제하시겠습니까?")) return;

    appState.agendas = appState.agendas.filter(function(a) { return a.id !== id; });
    if (appState.activeAgendaId === id) {
        appState.activeAgendaId = appState.agendas[0].id;
    }

    saveStateToStorage();
    renderAll();
    showToast(name + "이(가) 삭제되었습니다.");
}

// ============================================================================
// CONCERT SURVEY MODAL (연주회 강평 및 설문 요약 수정)
// ============================================================================

function openSurveyModal() {
    const modal = document.getElementById("surveyModal");
    if (!modal) return;
    const survey = appState.concertSurvey || {};

    const regInp = document.getElementById("inputSurveyRegular");
    const progInp = document.getElementById("inputSurveyProgram");
    const hallInp = document.getElementById("inputSurveyHall");
    const audInp = document.getElementById("inputSurveyAudience");
    const respInp = document.getElementById("inputSurveyRespondents");
    const songsInp = document.getElementById("inputSurveyFavoriteSongs");

    if (regInp) regInp.value = survey.regularConcertRate || 87.4;
    if (progInp) progInp.value = survey.programRate || 87.4;
    if (hallInp) hallInp.value = survey.hallRate || 97.2;
    if (audInp) audInp.value = survey.audienceRate || 91.6;
    if (respInp) respInp.value = survey.respondentCount || 71;

    if (songsInp) {
        songsInp.value = (survey.favoriteSongs || []).map(function(s) {
            return s.title + " | " + s.votes;
        }).join("\n");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeSurveyModal() {
    const modal = document.getElementById("surveyModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveSurveyModal() {
    const reg = parseFloat(document.getElementById("inputSurveyRegular") ? document.getElementById("inputSurveyRegular").value : 87.4) || 87.4;
    const prog = parseFloat(document.getElementById("inputSurveyProgram") ? document.getElementById("inputSurveyProgram").value : 87.4) || 87.4;
    const hall = parseFloat(document.getElementById("inputSurveyHall") ? document.getElementById("inputSurveyHall").value : 97.2) || 97.2;
    const aud = parseFloat(document.getElementById("inputSurveyAudience") ? document.getElementById("inputSurveyAudience").value : 91.6) || 91.6;
    const resp = parseInt(document.getElementById("inputSurveyRespondents") ? document.getElementById("inputSurveyRespondents").value : 71, 10) || 71;

    const songsRaw = (document.getElementById("inputSurveyFavoriteSongs") ? document.getElementById("inputSurveyFavoriteSongs").value : "").trim();
    const favoriteSongs = [];
    if (songsRaw) {
        songsRaw.split("\n").forEach(function(line) {
            const parts = line.split("|").map(function(s) { return s.trim(); });
            if (parts[0]) {
                favoriteSongs.push({
                    title: parts[0],
                    votes: parseInt(parts[1] || "1", 10) || 1
                });
            }
        });
    }

    if (!appState.concertSurvey) appState.concertSurvey = {};
    appState.concertSurvey.regularConcertRate = reg;
    appState.concertSurvey.programRate = prog;
    appState.concertSurvey.hallRate = hall;
    appState.concertSurvey.audienceRate = aud;
    appState.concertSurvey.respondentCount = resp;
    if (favoriteSongs.length > 0) {
        appState.concertSurvey.favoriteSongs = favoriteSongs;
    }

    closeSurveyModal();
    saveStateToStorage();
    renderAll();
    showToast("연주회 강평 및 설문 평가 수치가 저장되었습니다.");
}

// ============================================================================
// SETTLEMENT MODAL (결산 보고 내역 수정)
// ============================================================================

function openSettlementModal() {
    const modal = document.getElementById("settlementModal");
    if (!modal) return;
    const s = appState.settlement || {};

    const revInp = document.getElementById("inputSettleTotalRevenue");
    const expInp = document.getElementById("inputSettleTotalExpense");
    const balInp = document.getElementById("inputSettleBalance");
    const revItemsInp = document.getElementById("inputSettleRevenueItems");
    const expItemsInp = document.getElementById("inputSettleExpenseItems");

    if (revInp) revInp.value = s.totalRevenue || 109910000;
    if (expInp) expInp.value = s.totalExpense || 89022651;
    if (balInp) balInp.value = s.balance || 20887349;

    if (revItemsInp) {
        revItemsInp.value = (s.revenueItems || []).map(function(item) {
            return item.name + " | " + item.amount + " | " + (item.note || "");
        }).join("\n");
    }

    if (expItemsInp) {
        expItemsInp.value = (s.expenseItems || []).map(function(item) {
            return item.name + " | " + item.amount + " | " + (item.note || "");
        }).join("\n");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeSettlementModal() {
    const modal = document.getElementById("settlementModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function saveSettlementModal() {
    const totalRev = parseInt(document.getElementById("inputSettleTotalRevenue") ? document.getElementById("inputSettleTotalRevenue").value : 0, 10) || 0;
    const totalExp = parseInt(document.getElementById("inputSettleTotalExpense") ? document.getElementById("inputSettleTotalExpense").value : 0, 10) || 0;
    const balInpVal = parseInt(document.getElementById("inputSettleBalance") ? document.getElementById("inputSettleBalance").value : (totalRev - totalExp), 10);
    const balance = isNaN(balInpVal) ? (totalRev - totalExp) : balInpVal;

    const revRaw = (document.getElementById("inputSettleRevenueItems") ? document.getElementById("inputSettleRevenueItems").value : "").trim();
    const revenueItems = [];
    if (revRaw) {
        revRaw.split("\n").forEach(function(line) {
            const parts = line.split("|").map(function(s) { return s.trim(); });
            if (parts[0]) {
                revenueItems.push({
                    name: parts[0],
                    amount: parseInt(parts[1] || "0", 10) || 0,
                    note: parts[2] || ""
                });
            }
        });
    }

    const expRaw = (document.getElementById("inputSettleExpenseItems") ? document.getElementById("inputSettleExpenseItems").value : "").trim();
    const expenseItems = [];
    if (expRaw) {
        expRaw.split("\n").forEach(function(line) {
            const parts = line.split("|").map(function(s) { return s.trim(); });
            if (parts[0]) {
                expenseItems.push({
                    name: parts[0],
                    amount: parseInt(parts[1] || "0", 10) || 0,
                    note: parts[2] || ""
                });
            }
        });
    }

    if (!appState.settlement) appState.settlement = {};
    appState.settlement.totalRevenue = totalRev;
    appState.settlement.totalExpense = totalExp;
    appState.settlement.balance = balance;
    if (revenueItems.length > 0) appState.settlement.revenueItems = revenueItems;
    if (expenseItems.length > 0) appState.settlement.expenseItems = expenseItems;

    closeSettlementModal();
    saveStateToStorage();
    renderAll();
    showToast("2025 회계 결산 내역이 성공적으로 저장되었습니다.");
}

// Aliases for cross-modal call compatibility
function saveScheduleModal() { saveScheduleModalItem(); }
function saveEventModal() { saveEventModalItem(); }
function saveClauseModal() { saveClauseModalItem(); }
function closeEditClauseModal() { closeClauseModal(); }
function deleteClause(id) { deleteClauseItem(id); }
function deleteEvent(id) { deleteEventItem(id); }

function exportAssemblyReportHtml() {
    try {
        const maj = getMajorityThreshold(appState.totalAttendees);
        let html = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>2026 삼성한우리합창단 정기총회 의결 보고서</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:30px;line-height:1.6;color:#1e293b;max-width:900px;margin:0 auto;}' +
            'h1{border-bottom:2px solid #4f46e5;padding-bottom:10px;color:#1e1b4b;}' +
            'table{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;}' +
            'th,td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left;}' +
            'th{background:#f1f5f9;font-weight:bold;}' +
            '.badge-pass{color:#15803d;font-weight:bold;}' +
            '.badge-fail{color:#b91c1c;font-weight:bold;}' +
            '</style></head><body>' +
            '<h1>2026 삼성한우리합창단 정기총회 공식 의결 보고서</h1>' +
            '<p><strong>기준 성원:</strong> 재적 164명 중 참석 총원 ' + appState.totalAttendees + '명 | <strong>의결 정족수(2/3):</strong> ' + maj + '표 이상</p>' +
            '<h2>1. 정기총회 공식 식순 진행 현황</h2><ul>' +
            (appState.assemblySchedule || []).map(function(s) {
                return '<li><strong>' + escapeHtml(s.title) + '</strong> [' + escapeHtml(s.status) + ']: ' + escapeHtml(s.desc) + '</li>';
            }).join('') +
            '</ul>' +
            '<h2>2. 단칙 개정안(12건) 찬반투표 집계 결과</h2>' +
            '<table><thead><tr><th>No</th><th>안건명</th><th>구분</th><th>찬성</th><th>반대</th><th>기권</th><th>투표율</th><th>결과</th></tr></thead><tbody>' +
            (appState.agendas || []).map(function(ag) {
                const t = getAgendaTallies(ag);
                const isPass = t.approve >= maj;
                return '<tr>' +
                    '<td>' + ag.no + '</td>' +
                    '<td><strong>' + escapeHtml(ag.title) + '</strong></td>' +
                    '<td>' + escapeHtml(ag.category) + '</td>' +
                    '<td style="color:#4f46e5;font-weight:bold;">' + t.approve + '</td>' +
                    '<td>' + t.reject + '</td>' +
                    '<td>' + t.abstain + '</td>' +
                    '<td>' + t.percent + '%</td>' +
                    '<td>' + (isPass ? '<span class="badge-pass">가결</span>' : '<span class="badge-fail">부결</span>') + '</td>' +
                '</tr>';
            }).join('') +
            '</tbody></table>' +
            '<h2>3. 2026 연간 행사 일정 계획</h2><ul>' +
            (appState.events || []).map(function(ev) {
                return '<li><strong>' + escapeHtml(ev.title) + '</strong> (' + escapeHtml(ev.date) + ' · ' + escapeHtml(ev.place) + '): ' + escapeHtml(ev.desc) + '</li>';
            }).join('') +
            '</ul></body></html>';

        const dl = document.createElement("a");
        dl.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(html));
        dl.setAttribute("download", "hanwoori_2026_assembly_report.html");
        dl.click();
        showToast("총회 의결 보고서 HTML 다운로드가 완료되었습니다.");
    } catch(e) {
        showToast("보고서 생성 중 오류가 발생했습니다.");
    }
}

function exportVotesCsv() {
    try {
        const maj = getMajorityThreshold(appState.totalAttendees);
        let csv = "\uFEFF안건번호,안건명,구분,찬성표,반대표,기권표,총투표수,의결정족수기준,의결결과\n";
        (appState.agendas || []).forEach(function(ag) {
            const t = getAgendaTallies(ag);
            const isPass = t.approve >= maj;
            csv += [
                ag.no,
                "\"" + (ag.title || "").replace(/\"/g, "\"\"") + "\"",
                "\"" + (ag.category || "").replace(/\"/g, "\"\"") + "\"",
                t.approve,
                t.reject,
                t.abstain,
                t.total,
                maj + "표↑",
                isPass ? "가결" : "부결"
            ].join(",") + "\n";
        });
        const dl = document.createElement("a");
        dl.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
        dl.setAttribute("download", "hanwoori_2026_assembly_votes.csv");
        dl.click();
        showToast("투표 집계 CSV 파일이 다운로드되었습니다.");
    } catch(e) {
        showToast("CSV 다운로드 중 오류가 발생했습니다.");
    }
}

function exportJsonBackup() {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
        const dl = document.createElement("a");
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "hanwoori_assembly_2026_backup.json");
        dl.click();
        showToast("전체 데이터 JSON 백업 파일이 저장되었습니다.");
    } catch(e) {
        showToast("백업 저장 중 오류가 발생했습니다.");
    }
}
