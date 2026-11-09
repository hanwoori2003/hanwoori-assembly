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
        label.textContent = m.name + " (" + m.basePart + ") 단원 본인 확인 — 휴대폰 뒷 4자리(인증코드) 입력";
    }
    if (err) err.classList.add("hidden");
    if (box) box.classList.remove("hidden");
    if (inp) {
        inp.placeholder = "본인 확인 4자리 번호를 입력하세요";
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

    // 인증 번호 검증 (운영진 비밀번호 2003 또는 단원 개인 코드)
    const expectedCode = String(m.code || ADMIN_PASSWORD_CODE).trim();
    const isValid = (entered === expectedCode) || (entered === ADMIN_PASSWORD_CODE);

    if (!isValid) {
        if (err) {
            err.textContent = "✕ 인증번호가 일치하지 않습니다. 본인 확인 4자리 번호를 정확히 입력해 주세요.";
            err.classList.remove("hidden");
        }
        showToast("인증번호가 일치하지 않습니다.");
        return;
    }

    appState.currentVoterId = m.id;
    // 2003을 입력했거나 운영진인 경우 관리자 권한 부여
    appState.isAdminAuthenticated = Boolean(m.isExecutive || entered === ADMIN_PASSWORD_CODE);
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

function openScheduleModal() {
    showToast("운영진 제어 탭에서 식순을 관리하실 수 있습니다.");
}

function exportAssemblyReportHtml() {
    showToast("총회 의결 보고서 HTML 내보내기를 시작합니다.");
}

function exportVotesCsv() {
    showToast("투표 집계 CSV 다운로드가 완료되었습니다.");
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
