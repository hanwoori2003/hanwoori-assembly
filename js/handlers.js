// 5. 이벤트 핸들러, 모달 제어, 투표 제출 및 엑셀/백업 내보내기 모듈 (js/handlers.js)

function updateNavigationHash() {
    try {
        if (typeof window === "undefined" || !window.history || typeof window.history.replaceState !== "function") return;
        const tab = appState.activeTab || "events";
        const targetHash = (tab === "voting" && appState.activeAgendaId)
            ? ("#voting/" + encodeURIComponent(appState.activeAgendaId))
            : ("#" + encodeURIComponent(tab));
        if (window.location && window.location.hash !== targetHash) {
            window.history.replaceState(null, "", targetHash);
        }
    } catch (e) {}
}

function switchMainTab(tabId, btnEl, options) {
    if (!tabId) return;
    const opts = options || {};

    // Support both canonical and legacy alias names
    const cleanTabId = String(tabId).trim().replace(/^#/, "");
    const tabAliasMap = {
        "settlement": "settlement",
        "finance": "settlement",
        "voting": "voting",
        "rules": "voting",
        "bylaws": "bylaws",
        "viewRules": "bylaws",
        "search": "bylaws",
        "events": "events",
        "attendance": "attendance",
        "survey": "attendance",
        "concert": "concert",
        "sectionConcertReview": "concert",
        "concertReview": "concert",
        "activity": "activity",
        "election": "election",
        "winner": "winner",
        "admin": "admin"
    };

    let canonicalTab = tabAliasMap[cleanTabId] || cleanTabId;
    appState.activeTab = canonicalTab;
    try {
        if (typeof document !== "undefined" && document.documentElement) {
            document.documentElement.setAttribute("data-active-tab", canonicalTab);
        }
    } catch (e) {}
    
    // Hide all view panels (canonical + legacy aliases)
    const views = [
        "events",
        "attendance",
        "activity",
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

    // Show target view panel (checks canonical ID first, falls back to raw or alias, never leaves blank page)
    let targetEl = document.getElementById("view-" + canonicalTab) ||
                   document.getElementById("view-" + cleanTabId);
    if (!targetEl) {
        if (canonicalTab === "settlement") targetEl = document.getElementById("view-finance");
        else if (canonicalTab === "voting") targetEl = document.getElementById("view-rules");
        else if (canonicalTab === "bylaws") targetEl = document.getElementById("view-viewRules");
    }
    if (!targetEl) {
        canonicalTab = "events";
        appState.activeTab = "events";
        targetEl = document.getElementById("view-events");
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

        // Auto-scroll active tab into view in the horizontal tabs container
        try {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {
            activeBtn.scrollIntoView(false);
        }
    }

    if (tabId === "search") {
        setTimeout(function() {
            const searchInput = document.querySelector("#view-bylaws input[type='text']") ||
                                document.querySelector("#view-viewRules input[type='text']") ||
                                document.querySelector("input[placeholder*='단칙 키워드']");
            if (searchInput) searchInput.focus();
        }, 50);
    }

    if (!opts.skipPersist && typeof saveStateToStorage === "function") {
        saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    }
    updateNavigationHash();

    renderAll();
    if (!opts.skipScroll && typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Update tabs scroll indicators (left/right fade)
    if (typeof updateTabsScrollIndicator === "function") {
        setTimeout(updateTabsScrollIndicator, 100);
        setTimeout(updateTabsScrollIndicator, 350);
    }
}

// Function to programmatically scroll tabs left or right via arrow buttons
function scrollTabsNav(delta) {
    const nav = document.getElementById("mainTabsNav");
    if (!nav) return;
    nav.scrollBy({ left: delta, behavior: "smooth" });
    setTimeout(updateTabsScrollIndicator, 150);
    setTimeout(updateTabsScrollIndicator, 350);
}

// Function to update left/right fade gradients and scroll arrow buttons based on tabs scroll position
function updateTabsScrollIndicator() {
    const nav = document.getElementById("mainTabsNav");
    const fadeLeft = document.getElementById("tabsFadeLeft");
    const fadeRight = document.getElementById("tabsFadeRight");
    const btnLeft = document.getElementById("btnTabScrollLeft");
    const btnRight = document.getElementById("btnTabScrollRight");
    if (!nav) return;

    const scrollLeft = nav.scrollLeft;
    const maxScroll = nav.scrollWidth - nav.clientWidth;
    const isOverflowing = maxScroll > 4;

    const canScrollLeft = isOverflowing && scrollLeft > 8;
    if (fadeLeft) fadeLeft.style.opacity = canScrollLeft ? "0.9" : "0";
    if (btnLeft) {
        if (canScrollLeft) {
            btnLeft.classList.remove("hidden");
            btnLeft.classList.add("flex");
        } else {
            btnLeft.classList.add("hidden");
            btnLeft.classList.remove("flex");
        }
    }

    const canScrollRight = isOverflowing && (maxScroll - scrollLeft) > 8;
    if (fadeRight) fadeRight.style.opacity = canScrollRight ? "0.9" : "0";
    if (btnRight) {
        if (canScrollRight) {
            btnRight.classList.remove("hidden");
            btnRight.classList.add("flex");
        } else {
            btnRight.classList.add("hidden");
            btnRight.classList.remove("flex");
        }
    }
}

function openVoterLoginModal() {
    if (appState) appState.guestBrowsing = false;
    if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.classList.remove("is-authenticated");
        document.documentElement.removeAttribute("data-active-tab");
    }
    const gate = document.getElementById("loginGateScreen");
    const shell = document.getElementById("appShell");
    if (gate) {
        gate.classList.remove("hidden");
        gate.classList.add("flex");
    }
    if (shell) {
        shell.classList.add("hidden");
        shell.classList.remove("flex");
    }
    if (typeof populateLoginMemberSelect === "function") {
        populateLoginMemberSelect();
    }
    const nameInp = document.getElementById("loginNameInput");
    const codeInp = document.getElementById("loginCodeInput");
    const selEl = document.getElementById("loginMemberSelect");
    const errEl = document.getElementById("loginErrorMsg");
    if (nameInp) nameInp.value = "";
    if (codeInp) codeInp.value = "";
    if (selEl) selEl.value = "";
    if (errEl) {
        errEl.textContent = "";
        errEl.classList.add("hidden");
    }
    if (nameInp) {
        setTimeout(function() {
            try { nameInp.focus(); } catch (e) {}
        }, 80);
    }
}

function closeVoterLoginModal() {
    const modal = document.getElementById("voterLoginModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
    const errEl = document.getElementById("loginErrorMsg");
    if (errEl) {
        errEl.textContent = "";
        errEl.classList.add("hidden");
    }
}

function handleLoginSelectChange(selectEl) {
    if (!selectEl) return;
    const nameInp = document.getElementById("loginNameInput");
    const codeInp = document.getElementById("loginCodeInput");
    if (selectEl.value) {
        if (nameInp) nameInp.value = selectEl.value;
        if (codeInp) {
            try { codeInp.focus(); } catch (e) {}
        }
    }
}

function openAuthModal() {
    openVoterLoginModal();
}

function closeAuthModal() {
    closeVoterLoginModal();
}

function normalizeLoginText(str) {
    const raw = String(str || "");
    const nfc = (typeof raw.normalize === "function") ? raw.normalize("NFC") : raw;
    return nfc.trim();
}

function normalizeLoginCode(str) {
    const raw = String(str || "");
    const nfc = (typeof raw.normalize === "function") ? raw.normalize("NFC") : raw;
    // Convert full-width digits (０-９) to ASCII digits (0-9) and strip all whitespace
    return nfc.replace(/[\uFF10-\uFF19]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }).replace(/\s+/g, "");
}

let isLoggingIn = false;
function handleSimpleLoginSubmit(evt) {
    if (evt && typeof evt.preventDefault === "function") {
        evt.preventDefault();
    }
    if (isLoggingIn) return false;

    const nameInp = document.getElementById("loginNameInput");
    const codeInp = document.getElementById("loginCodeInput");
    const errEl = document.getElementById("loginErrorMsg");

    function showLoginError(msg) {
        if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
        }
    }

    const enteredRaw = nameInp ? nameInp.value : "";
    if (!enteredRaw || !enteredRaw.trim()) {
        showLoginError("이름을 입력해 주세요.");
        if (nameInp) nameInp.focus();
        return false;
    }

    // Clean entered name: remove titles like 단장, 부단장, 단원, 선생님, 님, parentheses, spaces
    const enteredName = normalizeLoginText(enteredRaw);
    let enteredClean = enteredName.replace(/(단장|부단장|단원|선생님|님|\(|\))/g, "").trim();
    if (!enteredClean) enteredClean = enteredName;
    const enteredCompact = enteredClean.replace(/\s+/g, "");
    const enteredCode = normalizeLoginCode(codeInp ? codeInp.value : "");

    const roster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER) && FULL_MEMBER_ROSTER.length > 0)
        ? FULL_MEMBER_ROSTER
        : ((typeof window !== "undefined" && window.FULL_MEMBER_ROSTER)
            ? window.FULL_MEMBER_ROSTER
            : (appState.members || []));

    // 1. Admin bypass keyword
    let matched = null;
    if (enteredClean === "관리자" || enteredClean === "운영진" || enteredClean.toLowerCase() === "admin") {
        matched = roster.find(function(m) { return m.isExecutive; }) || roster[0];
    }

    // 2. Exact name match
    if (!matched) {
        matched = roster.find(function(m) {
            if (!m || !m.name) return false;
            const mClean = normalizeLoginText(m.name).replace(/\s+/g, "");
            return mClean === enteredCompact;
        });
    }

    // 3. Alt names match
    if (!matched) {
        matched = roster.find(function(m) {
            if (!m || !Array.isArray(m.altNames)) return false;
            return m.altNames.some(function(alt) {
                return normalizeLoginText(alt).replace(/\s+/g, "") === enteredCompact;
            });
        });
    }

    // 4. Substring / partial match
    if (!matched && enteredCompact.length >= 2) {
        matched = roster.find(function(m) {
            if (!m || !m.name) return false;
            const mClean = normalizeLoginText(m.name).replace(/\s+/g, "");
            return mClean.indexOf(enteredCompact) !== -1 || enteredCompact.indexOf(mClean) !== -1;
        });
    }

    // 5. Universal Fallback: If name still not in 136 list, create a guest voter with entered name so user is NEVER blocked
    if (!matched) {
        matched = {
            id: "mem-guest-" + Date.now(),
            name: enteredName,
            part: "정단원",
            basePart: "정단원",
            detailPart: "-",
            company: "삼성",
            groupType: "samsung",
            isExecutive: false,
            role: "단원",
            code: enteredCode || "0000"
        };
        if (!Array.isArray(appState.members)) appState.members = [];
        appState.members.push(matched);
    }

    isLoggingIn = true;

    // Save entered code
    if (enteredCode) {
        matched.code = enteredCode;
    }

    appState.currentVoterId = matched.id;
    appState.hasExplicitLogin = true;
    appState.guestBrowsing = false;
    appState.isAdminAuthenticated = Boolean(matched.isExecutive);
    appState.adminPreviewAsMember = false;
    pendingExecMemberId = null;

    saveStateToStorage({ skipCloudConfigPush: true });

    // Direct DOM switch with !important to eliminate any specificity barrier
    const gate = document.getElementById("loginGateScreen");
    const shell = document.getElementById("appShell");
    if (gate) {
        gate.style.setProperty("display", "none", "important");
        gate.classList.add("hidden");
        gate.classList.remove("flex");
    }
    if (shell) {
        shell.style.setProperty("display", "flex", "important");
        shell.classList.remove("hidden");
        shell.classList.add("flex");
    }
    if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.classList.add("is-authenticated");
        document.documentElement.setAttribute("data-active-tab", appState.activeTab || "events");
    }

    renderAll();

    if (matched.isExecutive) {
        showToast("👑 " + matched.name + " 운영진님 로그인되었습니다.");
    } else {
        showToast(matched.name + " 단원님 환영합니다!");
    }

    setTimeout(function() {
        isLoggingIn = false;
    }, 400);

    return false;
}

function logoutCurrentUser() {
    appState.currentVoterId = null;
    appState.hasExplicitLogin = false;
    appState.guestBrowsing = false;
    appState.isAdminAuthenticated = false;
    appState.adminPreviewAsMember = false;
    pendingExecMemberId = null;
    appState.activeTab = "events";

    const nameInp = document.getElementById("loginNameInput");
    const codeInp = document.getElementById("loginCodeInput");
    const errEl = document.getElementById("loginErrorMsg");
    if (nameInp) nameInp.value = "";
    if (codeInp) codeInp.value = "";
    if (errEl) {
        errEl.textContent = "";
        errEl.classList.add("hidden");
    }

    saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    try {
        if (typeof document !== "undefined" && document.documentElement) {
            document.documentElement.classList.remove("is-authenticated");
            document.documentElement.removeAttribute("data-active-tab");
        }
    } catch (e) {}
    try {
        if (typeof window !== "undefined" && window.history && typeof window.history.replaceState === "function" && window.location) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
    } catch (e) {}
    renderAll();
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
    }
    showToast("로그아웃되었습니다.");
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
    if (!appState.currentVoterId || !getCurrentVoter()) {
        showToast("투표하려면 먼저 로그인해 주세요.");
        openVoterLoginModal();
        return;
    }
    const ag = getActiveAgenda();
    if (!ag) return;
    if (ag.isLocked || ag.status === "closed" || ag.status === "locked") {
        showToast("🔒 본 안건은 투표가 마감되어 의결이 확정되었습니다 (변경 불가).");
        return;
    }
    if (!ag.memberVotes) ag.memberVotes = {};

    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    const voterName = voter ? voter.name : "";
    ag.memberVotes[appState.currentVoterId] = choice;
    saveStateToStorage({ skipCloudConfigPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.submitAgendaVoteToCloud === "function") {
        window.FirebaseSync.submitAgendaVoteToCloud(ag.id, appState.currentVoterId, voterName, choice);
    }
    renderActiveVotingView();
    renderAgendaStepper();
    renderHeaderStatus();
    const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
    const agNo = ag.no || ag.agendaNo || ag.number || "";
    showToast("안건 " + agNo + "에 [" + labelMap[choice] + "] 투표를 완료했습니다.");
}

function cancelAgendaVote(agendaId) {
    if (!appState.currentVoterId || !getCurrentVoter()) {
        showToast("투표 취소는 로그인 후 이용할 수 있습니다.");
        openVoterLoginModal();
        return;
    }
    const ag = agendaId
        ? (appState.agendas || []).find(function(a) { return a && a.id === agendaId; })
        : getActiveAgenda();
    if (!ag) return;
    if (ag.isLocked || ag.locked || ag.status === "closed" || ag.status === "locked") {
        showToast("🔒 본 안건은 투표가 마감되어 의결이 확정되었습니다 (취소 불가).");
        return;
    }
    if (!ag.memberVotes || !ag.memberVotes[appState.currentVoterId]) {
        return;
    }

    const voterId = appState.currentVoterId;
    delete ag.memberVotes[voterId];
    if (ag.voters && Object.prototype.hasOwnProperty.call(ag.voters, voterId)) {
        delete ag.voters[voterId];
    }
    const updatedTallies = getAgendaTallies(ag);
    ag.agree = Math.max(0, updatedTallies.approve);
    ag.disagree = Math.max(0, updatedTallies.reject);
    ag.abstain = Math.max(0, updatedTallies.abstain);

    saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.deleteAgendaVoteFromCloud === "function") {
        window.FirebaseSync.deleteAgendaVoteFromCloud(ag.id, voterId);
    }
    renderActiveVotingView();
    renderAgendaStepper();
    renderHeaderStatus();
    showToast("투표가 취소되었습니다. (미투표 상태)");
}

function toggleAgendaLock(agendaId) {
    if (!agendaId) agendaId = appState.activeAgendaId;
    const ag = (appState.agendas || []).find(function(a) { return a.id === agendaId; });
    if (!ag) return;
    ag.isLocked = !ag.isLocked;
    ag.status = ag.isLocked ? "closed" : "voting";
    saveStateToStorage();
    renderAll();
    const agNo = ag.no || ag.agendaNo || ag.number || "";
    showToast(ag.isLocked
        ? ("안건 " + agNo + " 투표가 마감되어 의결이 확정되었습니다 (잠금 완료).")
        : ("안건 " + agNo + " 투표가 재개되었습니다 (잠금 해제).")
    );
}

function toggleAllAgendasLock(shouldLock) {
    const target = (typeof shouldLock === "boolean")
        ? shouldLock
        : !(appState.agendas || []).every(function(a) { return a.isLocked || a.status === "closed"; });
    (appState.agendas || []).forEach(function(a) {
        a.isLocked = target;
        a.status = target ? "closed" : "voting";
    });
    saveStateToStorage();
    renderAll();
    showToast(target
        ? "🔒 12개 모든 단칙 개정안 투표가 공식 마감(잠금)되었습니다."
        : "🔓 12개 모든 단칙 개정안 투표가 재개되었습니다."
    );
}

function selectAgenda(agendaId, options) {
    const opts = options || {};
    if (!agendaId) return;
    if (Array.isArray(appState.agendas) && appState.agendas.length > 0 &&
        !appState.agendas.some(function(a) { return a && a.id === agendaId; })) {
        return;
    }
    appState.activeAgendaId = agendaId;
    if (typeof saveStateToStorage === "function") {
        saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    }
    updateNavigationHash();
    renderAgendaStepper();
    renderActiveVotingView();
    renderHeaderStatus();

    // Auto-scroll active agenda pill into view
    const stepperContainer = document.getElementById("agendaStepperContainer");
    if (stepperContainer) {
        const activeAgendaBtn = stepperContainer.querySelector(".bg-indigo-600");
        if (activeAgendaBtn) {
            try {
                activeAgendaBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (e) {}
        }
    }

    // Scroll smoothly back to top of voting section when navigating via prev/next buttons
    if (opts.scrollToVotingTop) {
        const votingSection = document.getElementById("view-voting");
        if (votingSection && typeof votingSection.scrollIntoView === "function") {
            try {
                votingSection.scrollIntoView({ behavior: "smooth", block: "start" });
            } catch (e) {
                if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
            }
        } else if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }
}

function navigateAgendaStep(delta) {
    const agendas = Array.isArray(appState.agendas) ? appState.agendas : [];
    if (agendas.length === 0) return;
    const currentIdx = agendas.findIndex(function(a) { return a && a.id === appState.activeAgendaId; });
    const safeIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = safeIdx + delta;
    if (nextIdx < 0 || nextIdx >= agendas.length) return;
    selectAgenda(agendas[nextIdx].id, { scrollToVotingTop: true });
}

function voteElectionSingle(choice) {
    if (!appState.currentVoterId || !getCurrentVoter()) {
        showToast("투표하려면 먼저 로그인해 주세요.");
        openVoterLoginModal();
        return;
    }
    const elec = appState.election;
    if (!elec || !elec.singleVotes) return;
    if (elec.status === "closed" || elec.isLocked) {
        showToast("🔒 단장 선거 투표가 마감되어 의결이 확정되었습니다 (변경 불가).");
        return;
    }
    if (!elec.singleVotes.memberVotes) elec.singleVotes.memberVotes = {};
    if (!elec.memberVotes) elec.memberVotes = {};

    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    const voterName = voter ? voter.name : "";
    elec.singleVotes.memberVotes[appState.currentVoterId] = choice;
    elec.memberVotes[appState.currentVoterId] = choice;
    saveStateToStorage({ skipCloudConfigPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.submitElectionVoteToCloud === "function") {
        window.FirebaseSync.submitElectionVoteToCloud(appState.currentVoterId, voterName, choice);
    }
    renderElectionView();
    const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
    showToast("신임 단장 후보에 [" + labelMap[choice] + "] 투표를 완료했습니다.");
}

function voteElectionMulti(candId) {
    if (!appState.currentVoterId || !getCurrentVoter()) {
        showToast("투표하려면 먼저 로그인해 주세요.");
        openVoterLoginModal();
        return;
    }
    const elec = appState.election;
    if (!elec) return;
    if (elec.status === "closed" || elec.isLocked) {
        showToast("🔒 단장 선거 투표가 마감되어 의결이 확정되었습니다 (변경 불가).");
        return;
    }
    if (!elec.multiMemberVotes) elec.multiMemberVotes = {};
    if (!elec.memberVotes) elec.memberVotes = {};

    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    const voterName = voter ? voter.name : "";
    elec.multiMemberVotes[appState.currentVoterId] = candId;
    elec.memberVotes[appState.currentVoterId] = candId;
    saveStateToStorage({ skipCloudConfigPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.submitElectionVoteToCloud === "function") {
        window.FirebaseSync.submitElectionVoteToCloud(appState.currentVoterId, voterName, candId);
    }
    renderElectionView();
    const cand = (elec.candidates || []).find(function(c) { return c.id === candId; });
    showToast((cand ? cand.name : "후보자") + "에게 투표를 완료했습니다.");
}

function cancelElectionVote() {
    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    if (!appState.currentVoterId || !voter) {
        showToast("투표 취소는 로그인 후 이용할 수 있습니다.");
        openVoterLoginModal();
        return;
    }
    const elec = appState.election;
    if (!elec) return;
    if (elec.status === "closed" || elec.isLocked) {
        showToast("🔒 단장 선거 투표가 마감되어 의결이 확정되었습니다 (취소 불가).");
        return;
    }

    const voterId = voter.id || appState.currentVoterId;
    const hasSingle = Boolean(elec.singleVotes && elec.singleVotes.memberVotes && Object.prototype.hasOwnProperty.call(elec.singleVotes.memberVotes, voterId));
    const hasMulti = Boolean(elec.multiMemberVotes && Object.prototype.hasOwnProperty.call(elec.multiMemberVotes, voterId));
    const hasUnified = Boolean(elec.memberVotes && Object.prototype.hasOwnProperty.call(elec.memberVotes, voterId));
    if (!hasSingle && !hasMulti && !hasUnified) {
        return;
    }

    if (elec.singleVotes && elec.singleVotes.memberVotes) {
        delete elec.singleVotes.memberVotes[voterId];
    }
    if (elec.multiMemberVotes) {
        delete elec.multiMemberVotes[voterId];
    }
    if (elec.memberVotes) {
        delete elec.memberVotes[voterId];
    }
    if (elec.electionVoters) {
        delete elec.electionVoters[voterId];
    }

    saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.deleteElectionVoteFromCloud === "function") {
        window.FirebaseSync.deleteElectionVoteFromCloud(voterId);
    }
    if (typeof renderAll === "function") {
        renderAll();
    } else if (typeof renderElectionView === "function") {
        renderElectionView();
    }
    showToast("단장 선거 투표가 취소되었습니다. (미투표 상태)");
}

function resetAgendaVotesOnly() {
    var totalCount = (appState.agendas || []).length || 12;
    var confirmMsg = "⚠️ [주의] 모든 단칙 개정안(" + totalCount + "건)의 실시간 투표 기록을 0표로 완전히 초기화하시겠습니까?\n\n- 전체 안건의 찬성/반대/기권 모든 투표가 삭제됩니다.\n- Firebase 클라우드 및 모든 연결된 기기에서 실시간으로 0표 반영됩니다.\n- 이 작업은 취소할 수 없습니다.";
    if (typeof confirm === "function" && !confirm(confirmMsg)) {
        return;
    }
    (appState.agendas || []).forEach(function(ag) {
        if (!ag) return;
        ag.baseApprove = 0;
        ag.baseReject = 0;
        ag.baseAbstain = 0;
        ag.agree = 0;
        ag.disagree = 0;
        ag.abstain = 0;
        ag.memberVotes = {};
        ag.voters = {};
    });
    saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.resetAgendaVotesInCloud === "function") {
        window.FirebaseSync.resetAgendaVotesInCloud();
    }
    if (typeof renderAll === "function") {
        renderAll();
    }
    showToast("모든 단칙 개정안 투표가 0표로 초기화되었습니다.");
}

function resetSingleAgendaVotes(agendaId) {
    if (!agendaId) {
        var curAg = typeof getActiveAgenda === "function" ? getActiveAgenda() : null;
        agendaId = curAg ? curAg.id : (appState && appState.activeAgendaId);
    }
    if (!agendaId) return;

    var ag = (appState.agendas || []).find(function(a) { return a && a.id === agendaId; });
    if (!ag) return;

    var agNo = ag.no || ag.agendaNo || ag.number || "";
    var agTitle = ag.title || ("안건 제" + agNo + "호");
    var confirmMsg = "⚠️ [" + agTitle + "]의 실시간 투표 기록을 0표로 초기화하시겠습니까?\n\n- 본 안건에 참여한 모든 단원의 투표(찬성/반대/기권)가 삭제됩니다.\n- Firebase 클라우드 및 모든 기기에서 즉시 0표로 리셋됩니다.\n- 이 작업은 취소할 수 없습니다.";
    if (typeof confirm === "function" && !confirm(confirmMsg)) {
        return;
    }

    ag.baseApprove = 0;
    ag.baseReject = 0;
    ag.baseAbstain = 0;
    ag.agree = 0;
    ag.disagree = 0;
    ag.abstain = 0;
    ag.memberVotes = {};
    ag.voters = {};

    saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.resetSingleAgendaVotesInCloud === "function") {
        window.FirebaseSync.resetSingleAgendaVotesInCloud(agendaId);
    }
    if (typeof renderAll === "function") {
        renderAll();
    } else if (typeof renderActiveVotingView === "function") {
        renderActiveVotingView();
    }
    showToast("[" + agTitle + "] 투표 기록이 0표로 초기화되었습니다.");
}
if (typeof window !== "undefined") {
    window.resetAgendaVotesOnly = resetAgendaVotesOnly;
    window.resetSingleAgendaVotes = resetSingleAgendaVotes;
}

function resetElectionVotesOnly() {
    if (typeof confirm === "function" && !confirm("단장 선거(단독/다자)의 모든 실시간 투표 기록을 0표로 초기화하시겠습니까?")) {
        return;
    }
    if (!appState.election) appState.election = {};
    appState.election.singleVotes = {
        approve: 0,
        reject: 0,
        abstain: 0,
        memberVotes: {}
    };
    appState.election.memberVotes = {};
    appState.election.multiMemberVotes = {};
    appState.election.electionVoters = {};
    (appState.election.candidates || []).forEach(function(c) {
        if (c) c.baseVotes = 0;
    });
    saveStateToStorage({ skipCloudConfigPush: true, skipCloudPush: true });
    if (typeof window !== "undefined" &&
        window.FirebaseSync &&
        typeof window.FirebaseSync.resetElectionVotesInCloud === "function") {
        window.FirebaseSync.resetElectionVotesInCloud();
    }
    if (typeof renderAll === "function") {
        renderAll();
    }
    showToast("단장 선거 투표가 0표로 초기화되었습니다.");
}

function openCloudSyncModal() {
    if (typeof renderSyncStatusUI === "function") {
        renderSyncStatusUI();
    }
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
            if (targetTabSel) {
                const normTab = (typeof normalizeScheduleTargetTab === "function")
                    ? normalizeScheduleTargetTab(item.targetTab)
                    : (item.targetTab || "");
                targetTabSel.value = normTab;
            }
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
    const rawTargetTab = (document.getElementById("selectScheduleTargetTab") ? document.getElementById("selectScheduleTargetTab").value : "").trim();
    const targetTab = (typeof normalizeScheduleTargetTab === "function")
        ? normalizeScheduleTargetTab(rawTargetTab)
        : rawTargetTab;
    const defaultLabelMap = {
        "events": "정기총회 →",
        "activity": "활동보고 보기 →",
        "concert": "강평·요약 보기 →",
        "settlement": "결산탭 →",
        "voting": "투표탭 →",
        "election": "단장선거 →",
        "bylaws": "단칙보기 →",
        "winner": "당선공고 →",
        "admin": "운영진제어 →"
    };
    const rawBtnLabel = (document.getElementById("inputScheduleBtnLabel") ? document.getElementById("inputScheduleBtnLabel").value : "").trim();
    const btnLabel = rawBtnLabel || (targetTab ? (defaultLabelMap[targetTab] || "이동 →") : "");

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
    const isCurrentlyClosed = Boolean(appState.election.status === "closed" || appState.election.isLocked);
    appState.election.status = isCurrentlyClosed ? "voting" : "closed";
    appState.election.isLocked = (appState.election.status === "closed");
    saveStateToStorage();
    renderAll();
    showToast(appState.election.isLocked
        ? "🔒 단장 선거 투표가 마감되어 의결 결과가 확정되었습니다 (잠금 완료)."
        : "🔓 단장 선거 투표가 재개되었습니다 (잠금 해제)."
    );
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
            item.agendaNo = item.no;
            item.number = item.no;
            item.category = category || item.category || "운영체계";
            item.author = author || item.author || "운영진 발의";
            item.proposer = item.author;
            item.title = title;
            item.summary = summary;
            item.proposalReason = proposalReason;
            item.reason = proposalReason;
            item.beforeText = beforeText;
            item.afterText = afterText;
            showToast("안건 " + item.no + "이(가) 수정되었습니다.");
        }
    } else {
        const newId = "ag-" + Date.now();
        const nextNo = no || String(appState.agendas.length + 1);
        const newAg = {
            id: newId,
            no: nextNo,
            agendaNo: nextNo,
            number: nextNo,
            title: title,
            category: category || "운영체계",
            author: author || "운영진 발의",
            proposer: author || "운영진 발의",
            chapter: "제3장 조직",
            targetArticle: "신설",
            articleNo: "신설",
            summary: summary,
            proposalReason: proposalReason,
            reason: proposalReason,
            beforeText: beforeText,
            afterText: afterText,
            baseApprove: 0,
            baseReject: 0,
            baseAbstain: 0,
            agree: 0,
            disagree: 0,
            abstain: 0,
            voterTotal: 0,
            passThreshold: getMajorityThreshold(appState.totalAttendees || (typeof FULL_MEMBER_ROSTER !== "undefined" ? FULL_MEMBER_ROSTER.length : 134)),
            isLocked: false,
            status: "voting",
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
    showToast("2026 회계 결산 내역이 성공적으로 저장되었습니다.");
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
            '<p><strong>기준 성원:</strong> 재적 정단원 ' + (typeof FULL_MEMBER_ROSTER !== "undefined" ? FULL_MEMBER_ROSTER.length : 134) + '명 중 참석 총원 ' + appState.totalAttendees + '명 | <strong>의결 정족수(2/3):</strong> ' + maj + '표 이상</p>' +
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

function manualPushConfigToCloud() {
    if (typeof window === "undefined" || !window.FirebaseSync) {
        showToast("동기화 모듈을 찾을 수 없습니다.");
        return;
    }
    const st = window.FirebaseSync.getStatus();
    if (st.mode !== "cloud") {
        showToast("현재 로컬 저장 모드입니다. js/firebase-config.js에 Firebase 설정을 입력해 주세요.");
        return;
    }
    window.FirebaseSync.pushConfigToCloud(appState, { force: true, immediate: true })
        .then(function(res) {
            if (typeof renderSyncStatusUI === "function") renderSyncStatusUI();
            if (res && res.ok) {
                if (typeof renderAdminView === "function") renderAdminView();
                showToast("☁️ 현재 총회 데이터가 Firebase 서버에 즉시 반영되었습니다.");
            } else {
                showToast("서버 반영 중 오류가 발생했습니다: " + ((res && res.error) || "알 수 없는 오류"));
            }
        });
}

// ============================================================================
// 11. 활동보고 사진 라이트박스 모달 핸들러 (openPhotoLightbox / closePhotoLightbox)
// ============================================================================

function openPhotoLightbox(src, caption) {
    if (!src) return;
    const modal = document.getElementById("activityPhotoLightbox");
    const imgEl = document.getElementById("activityPhotoLightboxImg");
    const capEl = document.getElementById("activityPhotoLightboxCaption");
    if (!modal || !imgEl) return;
    imgEl.src = src;
    imgEl.alt = caption || "활동 사진";
    if (capEl) {
        capEl.textContent = caption || "";
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    try {
        if (typeof document !== "undefined" && document.body) {
            document.body.style.overflow = "hidden";
        }
    } catch (e) {}
}

function closePhotoLightbox() {
    const modal = document.getElementById("activityPhotoLightbox");
    const imgEl = document.getElementById("activityPhotoLightboxImg");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
    if (imgEl) {
        imgEl.src = "";
    }
    try {
        if (typeof document !== "undefined" && document.body) {
            document.body.style.overflow = "";
        }
    } catch (e) {}
}

if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("keydown", function(e) {
        if (e && e.key === "Escape") {
            const modal = document.getElementById("activityPhotoLightbox");
            if (modal && !modal.classList.contains("hidden")) {
                closePhotoLightbox();
            }
        }
    });
}


// ============================================================
// 2026 정기총회 참석·위임 사전 조사 핸들러
// ============================================================

let currentAttendanceFilter = "all";
let currentAttendanceSearch = "";

function voteAttendanceSurvey(choice) {
    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    if (!voter || !appState.currentVoterId) {
        showToast("⚠️ 단원 본인 확인(로그인) 후 참석 여부를 선택해 주세요.");
        if (typeof openMemberLoginModal === "function") {
            openMemberLoginModal();
        }
        return;
    }

    if (choice !== "onsite" && choice !== "shadow" && choice !== "absent") {
        return;
    }

    if (!appState.attendanceSurvey) {
        appState.attendanceSurvey = {
            deadline: "2026년 12월 12일 23:59",
            targetTotal: 136,
            quorumThreshold: 91,
            votes: {}
        };
    }
    if (!appState.attendanceSurvey.votes) {
        appState.attendanceSurvey.votes = {};
    }

    appState.attendanceSurvey.votes[appState.currentVoterId] = choice;

    if (typeof saveStateToStorage === "function") {
        saveStateToStorage();
    }
    if (typeof pushAttendanceVoteToCloud === "function") {
        pushAttendanceVoteToCloud(appState.currentVoterId, choice);
    }

    renderAll();

    if (choice === "onsite") {
        showToast("🏢 " + voter.name + " 단원님의 '현장 참석' 응답이 완료되었습니다. (성원 1명 산입)");
    } else if (choice === "shadow") {
        showToast("🤝 " + voter.name + " 단원님의 '현장 불참 / 쉐도우보팅(의결권 위임)' 응답이 완료되었습니다. (성원 1명 산입)");
    } else if (choice === "absent") {
        showToast("❌ " + voter.name + " 단원님의 '전체 불참' 응답이 저장되었습니다.");
    }
}

function cancelAttendanceSurveyVote() {
    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    if (!voter || !appState.currentVoterId || !appState.attendanceSurvey || !appState.attendanceSurvey.votes) {
        return;
    }
    delete appState.attendanceSurvey.votes[appState.currentVoterId];

    if (typeof saveStateToStorage === "function") {
        saveStateToStorage();
    }
    if (typeof pushAttendanceVoteToCloud === "function") {
        pushAttendanceVoteToCloud(appState.currentVoterId, "");
    }

    renderAll();
    showToast("↩️ " + voter.name + " 단원님의 참석 여부 응답이 취소되었습니다.");
}

function setAttendanceFilter(filterKey) {
    currentAttendanceFilter = filterKey || "all";
    if (typeof renderAttendanceView === "function") {
        renderAttendanceView();
    }
}

function filterAttendanceSearch(query) {
    currentAttendanceSearch = (query || "").trim().toLowerCase();
    if (typeof renderAttendanceView === "function") {
        renderAttendanceView();
    }
}

function copyUnansweredAttendanceMembers() {
    const roster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER))
        ? FULL_MEMBER_ROSTER
        : (appState.members || []);
    const votes = (appState.attendanceSurvey && appState.attendanceSurvey.votes) || {};

    const unanswered = roster.filter(function(m) {
        return !votes[m.id];
    });

    if (unanswered.length === 0) {
        showToast("🎉 모든 단원(136명)의 참석 조사가 완료되었습니다!");
        return;
    }

    const byPart = {};
    unanswered.forEach(function(m) {
        const p = m.part || "기타";
        if (!byPart[p]) byPart[p] = [];
        byPart[p].push(m.name + "(" + m.gen + "기)");
    });

    let msg = "[삼성한우리합창단 2026 정기총회 참석·위임 사전조사 미응답 단원 안내]\n\n";
    msg += "단칙 제20조 제2항에 따라 총회 개회를 위해서는 재적 정단원 136명 중 2/3 이상(91명)의 출석(현장 또는 쉐도우보팅 위임)이 필수적입니다.\n\n";
    msg += "원활한 총회 성원을 위해 아래 링크에서 [현장 참석] 또는 [쉐도우보팅 참여] 여부를 꼭 체크해 주시기 바랍니다!\n\n";
    msg += "⏳ 미응답 단원 (총 " + unanswered.length + "명):\n";

    ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"].forEach(function(partKey) {
        if (byPart[partKey] && byPart[partKey].length > 0) {
            msg += "• " + partKey + " (" + byPart[partKey].length + "명): " + byPart[partKey].join(", ") + "\n";
        }
    });

    msg += "\n👉 사전 참석·위임 조사 바로가기:\nhttps://hanwoori2003.github.io/hanwoori-assembly/#attendance";

    copyTextToClipboard(msg, "📋 미응답 단원 " + unanswered.length + "명 명단(카톡용)이 복사되었습니다!");
}

function copyOnsiteAttendanceMembers() {
    const roster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER))
        ? FULL_MEMBER_ROSTER
        : (appState.members || []);
    const votes = (appState.attendanceSurvey && appState.attendanceSurvey.votes) || {};

    const onsiteList = roster.filter(function(m) {
        return votes[m.id] === "onsite";
    });

    if (onsiteList.length === 0) {
        showToast("ℹ️ 현재 현장 참석으로 응답한 단원이 없습니다.");
        return;
    }

    const byPart = {};
    onsiteList.forEach(function(m) {
        const p = m.part || "기타";
        if (!byPart[p]) byPart[p] = [];
        byPart[p].push(m.name + "(" + m.gen + "기)");
    });

    let msg = "[삼성한우리합창단 2026 정기총회 현장 참석 예정 단원 명단]\n\n";
    msg += "🏢 총 현장 참석 인원: " + onsiteList.length + "명\n\n";

    ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"].forEach(function(partKey) {
        if (byPart[partKey] && byPart[partKey].length > 0) {
            msg += "• " + partKey + " (" + byPart[partKey].length + "명): " + byPart[partKey].join(", ") + "\n";
        }
    });

    copyTextToClipboard(msg, "🏢 현장 참석자 " + onsiteList.length + "명 명단이 클립보드에 복사되었습니다!");
}

function copyAttendanceSummaryReport() {
    const roster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER))
        ? FULL_MEMBER_ROSTER
        : (appState.members || []);
    const votes = (appState.attendanceSurvey && appState.attendanceSurvey.votes) || {};

    let onsite = 0;
    let shadow = 0;
    let absent = 0;
    let pending = 0;

    roster.forEach(function(m) {
        const v = votes[m.id];
        if (v === "onsite") onsite++;
        else if (v === "shadow") shadow++;
        else if (v === "absent") absent++;
        else pending++;
    });

    const quorumTotal = onsite + shadow;
    const goal = 91;
    const rate = Math.round((quorumTotal / goal) * 100);

    let msg = "[2026 삼성한우리합창단 정기총회 성원 현황 브리핑]\n\n";
    msg += "• 재적 정단원: 136명\n";
    msg += "• 개회 정족수 목표: 91명 이상 (2/3)\n";
    msg += "• 현재 성원 인정 합계: " + quorumTotal + "명 (" + rate + "% 달성)\n\n";
    msg += "세부 집계:\n";
    msg += " 1. 🏢 현장 참석: " + onsite + "명 (" + Math.round((onsite / 136) * 100) + "%)\n";
    msg += " 2. 🤝 쉐도우보팅(위임): " + shadow + "명 (" + Math.round((shadow / 136) * 100) + "%)\n";
    msg += " 3. ❌ 전체 불참: " + absent + "명\n";
    msg += " 4. ⏳ 미응답: " + pending + "명\n\n";

    if (quorumTotal >= goal) {
        msg += "✅ 총회 개회 정족수(91명) 충족 완료!";
    } else {
        msg += "⚠️ 개회 정족수 달성까지 앞으로 " + (goal - quorumTotal) + "명 추가 출석(현장 또는 위임)이 필요합니다.";
    }

    copyTextToClipboard(msg, "📊 정기총회 성원 현황 요약이 복사되었습니다!");
}

function copyTextToClipboard(text, successToastMsg) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).then(function() {
            showToast(successToastMsg);
        }).catch(function() {
            fallbackCopyText(text, successToastMsg);
        });
    } else {
        fallbackCopyText(text, successToastMsg);
    }
}

function fallbackCopyText(text, successToastMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        showToast(successToastMsg);
    } catch (e) {
        showToast("⚠️ 클립보드 복사 실패: 수동으로 복사해 주세요.");
    }
    document.body.removeChild(ta);
}
function enterAsGuest() {
    if (appState) appState.guestBrowsing = true;
    if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.classList.add("is-authenticated");
    }
    const gate = document.getElementById("loginGateScreen");
    const shell = document.getElementById("appShell");
    if (gate) {
        gate.style.setProperty("display", "none", "important");
        gate.classList.add("hidden");
        gate.classList.remove("flex");
    }
    if (shell) {
        shell.style.setProperty("display", "flex", "important");
        shell.classList.remove("hidden");
        shell.classList.add("flex");
    }
    renderAll();
    showToast("👀 게스트 열람 모드로 입장했습니다. 투표 시 본인 로그인이 필요합니다.");
}

function openMemberLoginModal() {
    if (typeof openVoterLoginModal === "function") {
        openVoterLoginModal();
    }
}
