// 4. DOM 렌더링 및 UI 바인딩 모듈 (js/render.js)

function renderAuthGate() {
    const gate = document.getElementById("loginGateScreen");
    const shell = document.getElementById("appShell");
    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    const isGuest = Boolean(appState && appState.guestBrowsing);

    if (voter || isGuest) {
        if (typeof document !== "undefined" && document.documentElement) {
            document.documentElement.classList.add("is-authenticated");
            if (appState && appState.activeTab) {
                document.documentElement.setAttribute("data-active-tab", appState.activeTab);
            }
        }
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
    } else {
        if (typeof document !== "undefined" && document.documentElement) {
            document.documentElement.classList.remove("is-authenticated");
            document.documentElement.removeAttribute("data-active-tab");
        }
        if (gate) {
            gate.style.setProperty("display", "flex", "important");
            gate.classList.remove("hidden");
            gate.classList.add("flex");
        }
        if (shell) {
            shell.style.setProperty("display", "none", "important");
            shell.classList.add("hidden");
            shell.classList.remove("flex");
        }
    }
}

function populateLoginMemberSelect() {
    const sel = document.getElementById("loginMemberSelect");
    if (!sel) return;
    if (sel.options && sel.options.length > 1) return;

    const roster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER))
        ? FULL_MEMBER_ROSTER
        : (appState.members || []);

    const parts = [
        { key: "소프라노", label: "소프라노 (Soprano)" },
        { key: "알토", label: "알토 (Alto)" },
        { key: "테너", label: "테너 (Tenor)" },
        { key: "베이스", label: "베이스 (Bass)" }
    ];

    parts.forEach(function(p) {
        const groupEl = document.createElement("optgroup");
        groupEl.label = p.label;
        const membersInPart = roster.filter(function(m) {
            return (m.part || "").indexOf(p.key) !== -1 || (m.basePart || "").indexOf(p.key) !== -1;
        });
        membersInPart.sort(function(a, b) {
            return (a.name || "").localeCompare(b.name || "", "ko");
        });
        membersInPart.forEach(function(m) {
            const opt = document.createElement("option");
            opt.value = m.name;
            opt.textContent = m.name + " (" + (m.detailPart || m.part || "") + (m.gen ? " · " + m.gen + "기" : "") + (m.role && m.role !== "-" ? " · " + m.role : "") + ")";
            opt.dataset.memberId = m.id;
            groupEl.appendChild(opt);
        });
        if (groupEl.children.length > 0) {
            sel.appendChild(groupEl);
        }
    });
}

function renderHeaderStatus() {
    const majority = getMajorityThreshold(appState.totalAttendees);
    const totalEl = document.getElementById("headerTotalAttendees");
    if (totalEl) totalEl.textContent = appState.totalAttendees + "명";
    const majEl = document.getElementById("headerMajorityThreshold");
    if (majEl) majEl.textContent = majority + "표↑";

    const voter = getCurrentVoter();
    const isLoggedIn = Boolean(voter);
    const isExec = isLoggedIn && ((typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated));
    const isRealExec = isLoggedIn && ((typeof isRealExecutiveAuthenticated === "function") ? isRealExecutiveAuthenticated() : isExec);

    let voterBadgeStr = "";
    if (isLoggedIn) {
        const voterPartStr = voter.detailPart ? (voter.part + " · " + voter.detailPart) : (voter.part || "");
        if (voter.isExecutive && isRealExec) {
            const roleLabel = (voter.role && voter.role !== "-") ? voter.role : voterPartStr;
            voterBadgeStr = "👑 " + voter.name + " (" + roleLabel + ")";
        } else {
            voterBadgeStr = voter.name + " (" + voterPartStr + ")";
        }
    }

    if (typeof renderSyncStatusUI === "function") {
        renderSyncStatusUI();
    }

    // Header styling based on Admin Mode
    const headerEl = document.getElementById("mainHeader");
    if (headerEl) {
        if (isExec) {
            headerEl.classList.add("admin-mode-active");
        } else {
            headerEl.classList.remove("admin-mode-active");
        }
    }

    // 헤더 로그인 / 배지 / 로그아웃 버튼 표시 제어
    const loginBtn = document.getElementById("btnHeaderLogin");
    const voterBtn = document.getElementById("btnHeaderVoter");
    const logoutBtn = document.getElementById("btnHeaderLogout");
    const badgeEl = document.getElementById("headerVoterBadge");

    if (isLoggedIn) {
        if (loginBtn) {
            loginBtn.classList.add("hidden");
            loginBtn.classList.remove("inline-flex");
        }
        if (voterBtn) {
            voterBtn.classList.remove("hidden");
            voterBtn.classList.add("inline-flex");
        }
        if (logoutBtn) {
            logoutBtn.classList.remove("hidden");
            logoutBtn.classList.add("inline-flex");
        }
        if (badgeEl) badgeEl.textContent = voterBadgeStr;
    } else {
        if (loginBtn) {
            loginBtn.classList.remove("hidden");
            loginBtn.classList.add("inline-flex");
        }
        if (voterBtn) {
            voterBtn.classList.add("hidden");
            voterBtn.classList.remove("inline-flex");
        }
        if (logoutBtn) {
            logoutBtn.classList.add("hidden");
            logoutBtn.classList.remove("inline-flex");
        }
        if (badgeEl) badgeEl.textContent = "";
    }

    // 하위 호환성 ID 업데이트 (오류 방지)
    const compatLabel = isLoggedIn ? voterBadgeStr : "로그인 필요";
    const b1 = document.getElementById("currentVoterBadgeText");
    if (b1) b1.textContent = compatLabel;
    const b2 = document.getElementById("stickyVoterBadgeText");
    if (b2) b2.textContent = compatLabel;
    const b3 = document.getElementById("miniHeaderMemberName");
    if (b3) b3.textContent = compatLabel;

    // Header Admin Mode Badge & Preview Toggle
    const headerAdminBadgeContainer = document.getElementById("headerAdminModeBadgeContainer");
    if (headerAdminBadgeContainer) {
        if (isRealExec) {
            if (isExec) {
                headerAdminBadgeContainer.innerHTML = 
                    '<span class="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs animate-pulse whitespace-nowrap">' +
                        '<span>👑</span> <span>운영진 모드 ON</span>' +
                    '</span>' +
                    '<button type="button" onclick="toggleAdminPreviewMode()" class="px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-[11px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap">' +
                        '<span>👁️</span> <span class="hidden sm:inline">일반 단원</span> <span>미리보기</span>' +
                    '</button>';
            } else {
                headerAdminBadgeContainer.innerHTML = 
                    '<span class="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold text-xs whitespace-nowrap">' +
                        '<span>👁️</span> <span>단원 화면 미리보기 중</span>' +
                    '</span>' +
                    '<button type="button" onclick="toggleAdminPreviewMode()" class="px-2 sm:px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-[11px] sm:text-xs transition shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap">' +
                        '<span>👑</span> <span class="hidden sm:inline">운영진 모드로</span> <span>복귀</span>' +
                    '</button>';
            }
        } else {
            headerAdminBadgeContainer.innerHTML = "";
        }
    }

    // Admin Quick Action Bar in Main Container
    const quickBarContainer = document.getElementById("adminQuickActionBarContainer");
    if (quickBarContainer) {
        if (isExec) {
            quickBarContainer.innerHTML = 
                '<div id="adminQuickActionBar" class="mb-6 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-3">' +
                    '<div class="flex items-center gap-2.5">' +
                        '<span class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/30 shadow-xs shrink-0">👑</span>' +
                        '<div>' +
                            '<div class="flex items-center gap-2">' +
                                '<span class="text-xs sm:text-sm font-black text-amber-300">운영진 통합 퀵 컨트롤 바</span>' +
                                '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">ADMIN ACTIVE</span>' +
                            '</div>' +
                            '<p class="text-[11px] text-slate-300">총회 식순·단칙 개정안·단장 선거·명부 및 설정을 원클릭으로 총괄 제어합니다.</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex items-center gap-1.5 flex-wrap">' +
                        '<button type="button" onclick="openScheduleModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>+</span> <span>식순 추가</span>' +
                        '</button>' +
                        '<button type="button" onclick="openAgendaModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>+</span> <span>새 개정안 추가</span>' +
                        '</button>' +
                        '<button type="button" onclick="openCandidateModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>+</span> <span>단장 후보 등록</span>' +
                        '</button>' +
                        '<button type="button" onclick="triggerBylawFileUpload()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer">' +
                            '<span>📂</span> <span>단칙 .docx 업로드</span>' +
                        '</button>' +
                        '<button type="button" onclick="switchMainTab(\'admin\')" class="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1 cursor-pointer shadow-sm">' +
                            '<span>⚙</span> <span>전체 설정/명부</span>' +
                        '</button>' +
                    '</div>' +
                '</div>';
        } else {
            quickBarContainer.innerHTML = "";
        }
    }

    // 투표 현황 네비게이션 배지
    const curAg = getActiveAgenda();
    const curIdx = curAg ? ((appState.agendas || []).findIndex(function(a) { return a.id === curAg.id; }) + 1) : 1;
    const navProg = document.getElementById("navBadgeAgendaProgress");
    if (navProg) navProg.textContent = curIdx + "/" + ((appState.agendas || []).length || 12);

    const navElec = document.getElementById("navBadgeElectionMode");
    if (navElec) {
        navElec.textContent = appState.election.mode === "single" ? "단독 찬반" : "다자 경선";
    }

    // 운영진 전용 탭 표시 제어 (단장 당선 공고, 운영진 제어)
    const winnerBtn = document.getElementById("tabBtn-winner");
    if (winnerBtn) {
        if (isExec || appState.winnerPagePublic) {
            winnerBtn.classList.remove("hidden");
            winnerBtn.classList.add("flex");
        } else {
            winnerBtn.classList.add("hidden");
            winnerBtn.classList.remove("flex");
        }
    }

    const adminBtn = document.getElementById("tabBtn-admin");
    if (adminBtn) {
        if (isExec) {
            adminBtn.classList.remove("hidden");
            adminBtn.classList.add("flex");
        } else {
            adminBtn.classList.add("hidden");
            adminBtn.classList.remove("flex");
        }
    }

    if (typeof updateTabsScrollIndicator === "function") {
        setTimeout(updateTabsScrollIndicator, 50);
    }
}

function getExecutiveRoleIconHtml(role) {
    const r = String(role || "").trim();
    if (!r) return "";
    // 부단장 -> 은왕관 (Silver Crown)
    if (r.indexOf("부단장") !== -1) {
        return '<span class="inline-flex items-center align-middle ml-1" title="부단장" data-role-icon="silver-crown" aria-label="부단장 은왕관">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 drop-shadow-2xs">' +
                '<defs>' +
                    '<linearGradient id="silverCrownGrad" x1="2" y1="5" x2="22" y2="20" gradientUnits="userSpaceOnUse">' +
                        '<stop offset="0%" stop-color="#E2E8F0"/>' +
                        '<stop offset="50%" stop-color="#CBD5E1"/>' +
                        '<stop offset="100%" stop-color="#94A3B8"/>' +
                    '</linearGradient>' +
                '</defs>' +
                '<path d="M3 18L2 8.5L7.5 12.5L12 5.5L16.5 12.5L22 8.5L21 18H3Z" fill="url(#silverCrownGrad)" stroke="#64748B" stroke-width="1.6" stroke-linejoin="round"/>' +
                '<rect x="3.5" y="18" width="17" height="2.4" rx="1.2" fill="#94A3B8" stroke="#64748B" stroke-width="1.2"/>' +
                '<circle cx="12" cy="5" r="1.4" fill="#F8FAFC" stroke="#64748B" stroke-width="1"/>' +
                '<circle cx="2.2" cy="8.2" r="1.2" fill="#E2E8F0" stroke="#64748B" stroke-width="1"/>' +
                '<circle cx="21.8" cy="8.2" r="1.2" fill="#E2E8F0" stroke="#64748B" stroke-width="1"/>' +
            '</svg>' +
        '</span>';
    }
    // 단장 -> 금왕관 (Gold Crown)
    if (r === "단장" || r.indexOf("단장") !== -1) {
        return '<span class="inline-flex items-center align-middle ml-1" title="단장" data-role-icon="gold-crown" aria-label="단장 금왕관">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 drop-shadow-xs">' +
                '<defs>' +
                    '<linearGradient id="goldCrownGrad" x1="2" y1="5" x2="22" y2="20" gradientUnits="userSpaceOnUse">' +
                        '<stop offset="0%" stop-color="#FDE047"/>' +
                        '<stop offset="50%" stop-color="#FBBF24"/>' +
                        '<stop offset="100%" stop-color="#F59E0B"/>' +
                    '</linearGradient>' +
                '</defs>' +
                '<path d="M3 18L2 8.5L7.5 12.5L12 5.5L16.5 12.5L22 8.5L21 18H3Z" fill="url(#goldCrownGrad)" stroke="#B45309" stroke-width="1.5" stroke-linejoin="round"/>' +
                '<rect x="3.5" y="18" width="17" height="2.4" rx="1.2" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/>' +
                '<circle cx="12" cy="5" r="1.4" fill="#FEF08A" stroke="#B45309" stroke-width="1"/>' +
                '<circle cx="2.2" cy="8.2" r="1.2" fill="#FDE047" stroke="#B45309" stroke-width="1"/>' +
                '<circle cx="21.8" cy="8.2" r="1.2" fill="#FDE047" stroke="#B45309" stroke-width="1"/>' +
            '</svg>' +
        '</span>';
    }
    // 음악총괄 -> 팅커벨 요정 (Tinkerbell Fairy SVG with emerald wings & gold sparkles)
    if (r.indexOf("음악총괄") !== -1) {
        return '<span class="inline-flex items-center align-middle ml-1" title="음악총괄" data-role-icon="tinkerbell-fairy" aria-label="음악총괄 요정">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0 drop-shadow-xs">' +
                '<defs>' +
                    '<linearGradient id="fairyWingGrad" x1="2" y1="4" x2="15" y2="16" gradientUnits="userSpaceOnUse">' +
                        '<stop offset="0%" stop-color="#A7F3D0"/>' +
                        '<stop offset="60%" stop-color="#34D399"/>' +
                        '<stop offset="100%" stop-color="#10B981"/>' +
                    '</linearGradient>' +
                    '<linearGradient id="fairyDressGrad" x1="9" y1="10" x2="16" y2="21" gradientUnits="userSpaceOnUse">' +
                        '<stop offset="0%" stop-color="#34D399"/>' +
                        '<stop offset="100%" stop-color="#059669"/>' +
                    '</linearGradient>' +
                '</defs>' +
                '<!-- Translucent emerald fairy wings -->' +
                '<path d="M11.2 11.2C8.2 7.2 3.2 5.4 2.4 7.8C1.7 10 5.4 12.6 9.8 13.2Z" fill="url(#fairyWingGrad)" fill-opacity="0.85" stroke="#059669" stroke-width="1" stroke-linejoin="round"/>' +
                '<path d="M10.4 13.4C7.2 13.8 4.4 15.8 5.2 17.4C6 18.9 8.8 17.4 10.8 15Z" fill="#6EE7B7" fill-opacity="0.8" stroke="#059669" stroke-width="0.9" stroke-linejoin="round"/>' +
                '<!-- Fairy head & bun -->' +
                '<circle cx="12.8" cy="5.5" r="1.2" fill="#FBBF24"/>' +
                '<circle cx="13" cy="7.4" r="2.1" fill="#FDE68A" stroke="#D97706" stroke-width="0.9"/>' +
                '<!-- Emerald Tinkerbell dress & silhouette -->' +
                '<path d="M12.2 9.6L14.1 9.8L16.3 16.5L13.5 15.4L12.1 17.2L10.3 15.3L12.2 9.6Z" fill="url(#fairyDressGrad)" stroke="#047857" stroke-width="0.9" stroke-linejoin="round"/>' +
                '<!-- Legs -->' +
                '<path d="M12 16.8L10.6 21.2M14.2 16.2L15.8 20.6" stroke="#D97706" stroke-width="1.3" stroke-linecap="round"/>' +
                '<!-- Magic wand & sparkling star -->' +
                '<path d="M14.3 11.4L19.4 7.6" stroke="#F59E0B" stroke-width="1.2" stroke-linecap="round"/>' +
                '<path d="M20 4.6L20.6 6.4L22.4 7L20.6 7.6L20 9.4L19.4 7.6L17.6 7L19.4 6.4L20 4.6Z" fill="#FBBF24"/>' +
                '<circle cx="18.2" cy="12.5" r="0.9" fill="#FDE047"/>' +
                '<circle cx="6.2" cy="4.8" r="0.85" fill="#FBBF24"/>' +
            '</svg>' +
        '</span>';
    }
    return "";
}

function renderExecutiveRosterTable() {
    const container = document.getElementById("executiveRosterTableBody");
    if (!container) return;
    let html = "";
    EXECUTIVE_ROSTER.forEach(function(exec, i) {
        html += '<tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs whitespace-nowrap">' +
            '<td class="py-2.5 px-2.5 sm:px-3 text-center text-slate-500 font-semibold">' + (i + 1) + '</td>' +
            '<td class="py-2.5 px-2.5 sm:px-3 font-bold text-slate-800">' +
                '<span class="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold mr-1.5">' + escapeHtml(exec.role) + getExecutiveRoleIconHtml(exec.role) + '</span>' +
                (exec.subRole && exec.subRole !== '-' ? '<span class="text-slate-500 font-normal">(' + escapeHtml(exec.subRole) + ')</span>' : '') +
            '</td>' +
            '<td class="py-2.5 px-2.5 sm:px-3 font-extrabold text-slate-900">' + escapeHtml(exec.name) + '</td>' +
            '<td class="py-2.5 px-2.5 sm:px-3 text-slate-600">' + escapeHtml(String(exec.gen || '').replace(/기+$/g, '')) + '</td>' +
            '<td class="py-2.5 px-2.5 sm:px-3">' +
                '<span class="font-semibold text-slate-700">' + escapeHtml(exec.part) + '</span>' +
                (exec.detailPart ? '<span class="text-slate-400 text-[11px] ml-1">(' + escapeHtml(exec.detailPart) + ')</span>' : '') +
            '</td>' +
            '<td class="py-2.5 px-2.5 sm:px-3 text-slate-600">' + escapeHtml(exec.company) + '</td>' +
        '</tr>';
    });
    container.innerHTML = html;
}

function renderFullMemberRosterTable() {
    const container = document.getElementById("fullMemberRosterTableBody");
    if (!container) return;
    const fKey = appState.rosterPartFilter || "all";
    const q = (appState.rosterSearchQuery || "").trim().toLowerCase();

    const rosterPool = (appState && Array.isArray(appState.members) && appState.members.length > 0)
        ? appState.members
        : ((typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER)) ? FULL_MEMBER_ROSTER : []);

    const filtered = rosterPool.filter(function(m) {
        if (!m) return false;
        if (fKey !== "all" && m.basePart !== fKey) return false;
        if (q) {
            const hay = ((m.name || "") + " " + (m.part || "") + " " + (m.company || "") + " " + (m.gen || "")).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        return true;
    });

    let html = "";
    filtered.forEach(function(m, i) {
        html += '<tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">' +
            '<td class="py-2 px-3 text-center text-slate-400">' + (i + 1) + '</td>' +
            '<td class="py-2 px-3 font-bold text-slate-900">' + escapeHtml(m.name) + '</td>' +
            '<td class="py-2 px-3 text-slate-600">' + escapeHtml(String(m.gen || '').replace(/기+$/g, '')) + '</td>' +
            '<td class="py-2 px-3">' +
                '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">' + escapeHtml(m.part) + '</span>' +
            '</td>' +
            '<td class="py-2 px-3 text-slate-600">' + escapeHtml(m.company) + '</td>' +
            '<td class="py-2 px-3">' +
                (m.isExecutive ? '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">' + escapeHtml(m.role) + '</span>' : '<span class="text-slate-400 text-[11px]">일반단원</span>') +
            '</td>' +
        '</tr>';
    });
    container.innerHTML = html || '<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">일치하는 단원이 없습니다.</td></tr>';
}

function renderEventsView() {
    const isExec = (typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated);

    // 1. 식순 헤더 운영진 제어 버튼
    const schHeader = document.getElementById("assemblyScheduleAdminHeaderControls");
    if (schHeader) {
        if (isExec) {
            schHeader.innerHTML =
                '<span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0">🔧 운영진 편집 모드</span>' +
                '<button type="button" onclick="openScheduleModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer">+ 식순 추가</button>';
        } else {
            schHeader.innerHTML = "";
        }
    }

    // 2. 식순 리스트 렌더링
    const container = document.getElementById("assemblyScheduleListContainer");
    if (container) {
        let html = "";
        (appState.assemblySchedule || []).forEach(function(item) {
            const isDone = item.status === "완료";
            const isIng = item.status === "진행중";
            const statusBadge = isDone
                ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">완료</span>'
                : (isIng
                    ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse shrink-0">진행중</span>'
                    : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 shrink-0">' + escapeHtml(item.status) + '</span>');

            const safeTargetTab = (typeof normalizeScheduleTargetTab === "function")
                ? normalizeScheduleTargetTab(item.targetTab)
                : (item.targetTab === "sectionConcertReview" ? "concert" : (item.targetTab || ""));

            const execControls = isExec
                ? '<div class="flex items-center gap-1.5 shrink-0">' +
                    '<button type="button" onclick="openScheduleModal(\'' + item.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteScheduleItem(\'' + item.id + '\')" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
                  '</div>'
                : '';

            const jumpBtn = safeTargetTab
                ? '<button type="button" onclick="switchMainTab(\'' + escapeHtml(safeTargetTab) + '\')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 transition cursor-pointer text-center whitespace-nowrap shadow-2xs">' + escapeHtml(item.btnLabel || "이동 →") + '</button>'
                : '';

            let actionsHtml = "";
            if (jumpBtn || execControls) {
                actionsHtml = '<div class="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 min-w-0">' +
                    jumpBtn +
                    (execControls || '') +
                '</div>';
            }

            html += '<div class="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full overflow-hidden">' +
                '<div class="flex items-start gap-3 min-w-0 flex-1">' +
                    statusBadge +
                    '<div class="min-w-0 flex-1">' +
                        '<h4 class="text-sm font-extrabold text-slate-900 break-keep">' + escapeHtml(item.title) + '</h4>' +
                        '<p class="text-xs text-slate-600 mt-0.5 break-keep leading-relaxed">' + escapeHtml(item.desc) + '</p>' +
                    '</div>' +
                '</div>' +
                actionsHtml +
            '</div>';
        });
        container.innerHTML = html || '<div class="text-center py-6 text-slate-400 text-xs">등록된 식순이 없습니다.</div>';
    }

    // 3. 2026 활동보고 (연간 행사 로드맵) 렌더링 동기화
    renderActivityView();
}

function renderActivityView() {
    const isExec = (typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated);
    const report = (typeof ACTIVITY_REPORT_DATA !== "undefined" && ACTIVITY_REPORT_DATA) ? ACTIVITY_REPORT_DATA : null;
    const escapeJsSingle = function(val) {
        return escapeHtml(String(val || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
    };

    // ------------------------------------------------------------------
    // Section 1: 단원 현황 (KPI + 파트별 현황 + 기수별 현황 바 차트 + 사진 명부)
    // ------------------------------------------------------------------
    const statsCont = document.getElementById("activityMemberStatsContainer");
    if (statsCont && report) {
        const ms = report.memberSummary || { total: 131, existing: 116, newcomers: 15, note: "정단원 131명 기준" };
        const partColors = {
            rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", bar: "from-rose-500 to-pink-500", pill: "bg-white text-rose-700 border-rose-200" },
            amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "from-amber-500 to-orange-500", pill: "bg-white text-amber-800 border-amber-200" },
            sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", bar: "from-sky-500 to-blue-500", pill: "bg-white text-sky-700 border-sky-200" },
            indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", bar: "from-indigo-500 to-violet-500", pill: "bg-white text-indigo-700 border-indigo-200" }
        };

        let kpiHtml =
            '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">' +
                '<div class="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-200/80 shadow-2xs flex flex-col justify-between">' +
                    '<div>' +
                        '<div class="text-xs font-bold text-indigo-700 whitespace-nowrap">총 정단원</div>' +
                        '<div class="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tabular-nums">' + ms.total + '<span class="text-sm font-bold text-slate-500 ml-0.5">명</span></div>' +
                        '<div class="text-[11px] text-slate-500 mt-0.5 font-medium">기존 ' + ms.existing + '명 + 신입 ' + ms.newcomers + '명</div>' +
                    '</div>' +
                    (ms.note ? '<div class="pt-2 mt-2 border-t border-indigo-100 text-[10.5px] text-indigo-600 leading-snug break-keep">' + escapeHtml(ms.note) + '</div>' : '') +
                '</div>' +
                '<div class="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 shadow-2xs flex flex-col justify-between">' +
                    '<div>' +
                        '<span class="text-xs font-bold text-slate-600 whitespace-nowrap">기존단원</span>' +
                        '<div class="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tabular-nums">' + ms.existing + '<span class="text-sm font-bold text-slate-500 ml-0.5">명</span></div>' +
                        '<div class="text-[11px] text-slate-500 mt-0.5">전체의 ' + Math.round((ms.existing / ms.total) * 100) + '% (1~20기)</div>' +
                    '</div>' +
                '</div>' +
                '<div class="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs flex flex-col justify-between">' +
                    '<div>' +
                        '<span class="text-xs font-bold text-emerald-700 whitespace-nowrap">신입단원 · 21기(신단)</span>' +
                        '<div class="text-2xl sm:text-3xl font-black text-emerald-800 mt-1.5 tabular-nums">' + ms.newcomers + '<span class="text-sm font-bold text-emerald-600 ml-0.5">명</span></div>' +
                        '<div class="text-[11px] text-emerald-600 mt-0.5">전체의 ' + Math.round((ms.newcomers / ms.total) * 100) + '% (무대 출연 정단원 15명)</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        // Part stats panel
        let partsRowsHtml = "";
        (report.partStats || []).forEach(function(p) {
            const c = partColors[p.color] || partColors.indigo;
            const pct = Math.round((p.total / ms.total) * 100);
            const subBadges = (p.subParts || []).map(function(sp) {
                if (sp.photo) {
                    return '<button type="button" onclick="openPhotoLightbox(\'' + escapeJsSingle(sp.photo) + '\', \'' + escapeJsSingle(sp.title || (sp.label + ' 사진 명부')) + '\')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ' + c.pill + ' cursor-pointer hover:shadow-xs transition" title="클릭하여 ' + escapeHtml(sp.label) + ' 사진 명부 보기">' +
                        '<span>' + escapeHtml(sp.label) + '</span>' +
                        '<span class="font-black">' + escapeHtml(sp.count) + '명</span>' +
                        '<span class="text-[9px] opacity-70">📸</span>' +
                    '</button>';
                }
                return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ' + c.pill + '">' +
                    '<span>' + escapeHtml(sp.label) + '</span>' +
                    '<span class="font-black">' + escapeHtml(sp.count) + '명</span>' +
                '</span>';
            }).join("");

            partsRowsHtml +=
                '<div class="p-3 rounded-xl border ' + c.bg + ' ' + c.border + ' space-y-2">' +
                    '<div class="flex items-center justify-between gap-2 flex-wrap">' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="text-sm font-black ' + c.text + '">' + escapeHtml(p.part) + '</span>' +
                            '<span class="text-xs font-extrabold text-slate-900 tabular-nums">' + p.total + '명</span>' +
                            '<span class="text-[11px] text-slate-500">(' + pct + '%)</span>' +
                        '</div>' +
                        '<div class="flex items-center gap-1.5 flex-wrap">' + subBadges + '</div>' +
                    '</div>' +
                    '<div class="w-full h-2 rounded-full bg-white/80 overflow-hidden">' +
                        '<div class="h-full rounded-full bg-gradient-to-r ' + c.bar + '" style="width:' + Math.min(100, Math.round((p.total / 45) * 100)) + '%"></div>' +
                    '</div>' +
                '</div>';
        });

        // Generation stats bar chart (1기~20기 & 21기(신단))
        const genList = report.generationStats || [];
        const maxGenCount = genList.reduce(function(mx, item) { return Math.max(mx, item.count); }, 1);
        let genBarsHtml = "";
        genList.forEach(function(g) {
            const heightPx = Math.max(8, Math.round((g.count / maxGenCount) * 124));
            const barClass = g.highlight
                ? "bg-gradient-to-t from-indigo-600 via-violet-500 to-rose-500 shadow-sm"
                : "bg-slate-300 hover:bg-slate-400";
            const countClass = g.highlight ? "text-indigo-700 font-black" : "text-slate-500 font-bold";
            const labelClass = g.highlight ? "text-rose-600 font-extrabold" : "text-slate-500 font-semibold";
            const is21 = g.gen === 21 || g.gen === "신입" || String(g.label).indexOf("21기") !== -1;
            const wrapClass = is21
                ? "flex flex-col items-center justify-end shrink-0 min-w-[58px] pt-2 pb-1 bg-indigo-50/90 rounded-lg px-1.5 mx-0.5"
                : (g.highlight ? "flex flex-col items-center justify-end flex-1 min-w-[28px] pt-2 pb-1 bg-indigo-50/70 rounded-lg px-0.5" : "flex flex-col items-center justify-end flex-1 min-w-[26px] pt-2 pb-1");
            const genText = is21 ? "21기(신단)" : ((typeof g.gen === "number" || (!isNaN(Number(g.gen)) && g.gen !== "신입")) ? (g.gen + "기") : (g.label || g.gen));
            genBarsHtml +=
                '<div class="' + wrapClass + '" title="' + escapeHtml(g.label) + ': ' + g.count + '명">' +
                    '<span class="text-[10px] leading-none mb-1 tabular-nums ' + countClass + '">' + g.count + '</span>' +
                    '<div class="w-3.5 sm:w-4.5 rounded-t-md transition-all ' + barClass + '" style="height:' + heightPx + 'px"></div>' +
                    '<span class="text-[10px] mt-1.5 leading-tight text-center ' + (is21 ? 'tracking-tighter font-black whitespace-nowrap' : 'leading-none whitespace-nowrap') + ' ' + labelClass + '">' + genText + '</span>' +
                '</div>';
        });

        const panelsHtml =
            '<div class="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0 max-w-full">' +
                '<div class="lg:col-span-5 min-w-0 max-w-full p-4 rounded-2xl bg-slate-50/60 border border-slate-200 space-y-3">' +
                    '<div class="flex items-center justify-between">' +
                        '<h4 class="text-sm font-extrabold text-slate-900">파트별 현황</h4>' +
                        '<span class="text-[11px] text-slate-400 font-medium">* 8개 파트별 명부 기준</span>' +
                    '</div>' +
                    '<div class="space-y-2.5">' + partsRowsHtml + '</div>' +
                '</div>' +
                '<div class="lg:col-span-7 min-w-0 max-w-full p-4 rounded-2xl bg-slate-50/60 border border-slate-200 flex flex-col justify-between space-y-3">' +
                    '<div class="flex flex-wrap items-center justify-between gap-2">' +
                        '<div>' +
                            '<h4 class="text-sm font-extrabold text-slate-900">기수별 현황 (1기 ~ 20기 &amp; 21기 신단)</h4>' +
                            '<p class="text-[11px] text-slate-500 mt-0.5">최근 기수(16~20기) 및 21기(신단) 단원이 전체의 63%를 차지합니다.</p>' +
                        '</div>' +
                        '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-rose-500 text-white text-xs font-black shadow-xs whitespace-nowrap">' +
                            escapeHtml(report.generationHighlightBadge || "16~20기 및 21기(신단): 83명 (63%)") +
                        '</span>' +
                    '</div>' +
                    '<div class="w-full min-w-0 rounded-xl bg-white border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs">' +
                        '<div class="overflow-x-auto pb-1 max-w-full scrollbar-thin">' +
                            '<div class="min-w-[540px] h-[172px] flex items-end gap-1 pt-2 px-1">' +
                                genBarsHtml +
                            '</div>' +
                        '</div>' +
                        '<div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 sm:hidden">' +
                            '<span>◀ 1기</span>' +
                            '<span class="text-indigo-600 font-bold">← 좌우로 스크롤 →</span>' +
                            '<span>21기(신단) ▶</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex items-center justify-end gap-3 text-xs text-slate-500 flex-wrap pt-1">' +
                        '<span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block"></span>1~15기 (48명 · 37%)</span>' +
                        '<span class="inline-flex items-center gap-1.5 font-bold text-indigo-700"><span class="w-2.5 h-2.5 rounded-xs bg-gradient-to-r from-indigo-600 to-rose-500 inline-block"></span>16~20기 및 21기(신단) (83명 · 63%)</span>' +
                    '</div>' +
                '</div>' +
            '</div>';

        // 8-Part Photo Roster Gallery
        const rosterGalleryItems = [
            { label: "Soprano I", count: "17명", photo: "assets/roster/soprano_1.jpg", color: "border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-800" },
            { label: "Soprano II", count: "23명", photo: "assets/roster/soprano_2.jpg", color: "border-pink-200 bg-pink-50/50 hover:bg-pink-50 text-pink-800" },
            { label: "Alto I", count: "22명", photo: "assets/roster/alto_1.jpg", color: "border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-800" },
            { label: "Alto II", count: "18명", photo: "assets/roster/alto_2.jpg", color: "border-orange-200 bg-orange-50/50 hover:bg-orange-50 text-orange-800" },
            { label: "Tenor I", count: "15명", photo: "assets/roster/tenor_1.jpg", color: "border-sky-200 bg-sky-50/50 hover:bg-sky-50 text-sky-800" },
            { label: "Tenor II", count: "14명", photo: "assets/roster/tenor_2.jpg", color: "border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-800" },
            { label: "Bass I", count: "18명", photo: "assets/roster/bass_1.jpg", color: "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-800" },
            { label: "Bass II", count: "9명", photo: "assets/roster/bass_2.jpg", color: "border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-800" }
        ];

        let rosterGalleryHtml =
            '<div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">' +
                '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">' +
                    '<div class="flex items-center justify-between sm:justify-start gap-2">' +
                        '<h4 class="text-sm font-black text-slate-900 break-keep">📸 파트별 정단원 사진 명부 <span class="text-xs font-bold text-slate-500">(8개 파트 · 131명)</span></h4>' +
                        '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap shrink-0">클릭 시 확대</span>' +
                    '</div>' +
                    '<span class="text-[11px] text-slate-400">각 파트 카드를 클릭하면 상세 사진 명부가 크게 열립니다</span>' +
                '</div>' +
                '<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">';

        rosterGalleryItems.forEach(function(r) {
            const cap = r.label + ' 사진 명부 (' + r.count + ')';
            rosterGalleryHtml +=
                '<div onclick="openPhotoLightbox(\'' + escapeJsSingle(r.photo) + '\', \'' + escapeJsSingle(cap) + '\')" class="group relative flex flex-col rounded-xl overflow-hidden border ' + r.color + ' p-2 cursor-pointer transition hover:shadow-md hover:scale-[1.02] bg-white">' +
                    '<div class="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 mb-1.5 shadow-2xs">' +
                        '<img src="' + escapeHtml(r.photo) + '" alt="' + escapeHtml(cap) + '" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />' +
                        '<span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900/70 text-white backdrop-blur-xs">🔍 확대</span>' +
                    '</div>' +
                    '<div class="flex items-center justify-between text-xs">' +
                        '<span class="font-black truncate">' + escapeHtml(r.label) + '</span>' +
                        '<span class="text-[11px] font-bold opacity-80 shrink-0">' + escapeHtml(r.count) + '</span>' +
                    '</div>' +
                '</div>';
        });
        rosterGalleryHtml += '</div></div>';

        statsCont.innerHTML = kpiHtml + panelsHtml + rosterGalleryHtml;
    }

    // ------------------------------------------------------------------
    // Section 2: 한우리 주요 변화 (6가지)
    // ------------------------------------------------------------------
    const changesCont = document.getElementById("activityMajorChangesContainer");
    if (changesCont && report) {
        let chHtml = "";
        (report.majorChanges || []).forEach(function(item) {
            const numStr = item.no < 10 ? ("0" + item.no) : String(item.no);
            let photoThumbHtml = "";
            if (item.photo) {
                const cap = (item.title || "") + (item.desc ? (" · " + item.desc) : "");
                photoThumbHtml =
                    '<div class="mt-1 pl-7">' +
                        '<div class="relative group rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in shadow-2xs">' +
                            '<img src="' + escapeHtml(item.photo) + '" alt="' + escapeHtml(cap) + '" loading="lazy" onclick="openPhotoLightbox(\'' + escapeJsSingle(item.photo) + '\', \'' + escapeJsSingle(cap) + '\')" class="w-full aspect-video object-cover transition-transform duration-200 group-hover:scale-[1.03]" />' +
                            '<span class="pointer-events-none absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-bold backdrop-blur-xs">🔍 크게 보기</span>' +
                        '</div>' +
                    '</div>';
            }
            chHtml +=
                '<div class="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition shadow-2xs flex flex-col gap-2">' +
                    '<div class="flex items-center justify-between gap-2">' +
                        '<span class="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700">' +
                            '<span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black">' + numStr + '</span>' +
                            '<span class="text-sm font-extrabold text-slate-900 break-keep">' + escapeHtml(item.title) + '</span>' +
                        '</span>' +
                        '<span class="text-base shrink-0">' + escapeHtml(item.icon || "✨") + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-600 leading-relaxed break-keep pl-7">' + escapeHtml(item.desc) + '</p>' +
                    photoThumbHtml +
                '</div>';
        });
        changesCont.innerHTML = chHtml;
    }

    // ------------------------------------------------------------------
    // Section 3: 월별 주요 활동 타임라인 ("올해를 회상하며...")
    // ------------------------------------------------------------------
    const evHeader = document.getElementById("annualEventsAdminHeaderControls");
    if (evHeader) {
        if (isExec) {
            evHeader.innerHTML =
                '<span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0">🔧 운영진 편집 모드</span>' +
                '<button type="button" onclick="openEditEventModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer">+ 행사 내역 추가</button>';
        } else {
            evHeader.innerHTML = "";
        }
    }

    const evCont = document.getElementById("annualEventsListContainer");
    if (evCont) {
        let evHtml = "";
        (appState.events || []).forEach(function(ev, idx) {
            const execControls = isExec
                ? '<div class="flex items-center gap-1 shrink-0 pt-1 sm:pt-0">' +
                    '<button type="button" onclick="openEditEventModal(\'' + ev.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteEventItem(\'' + ev.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
                  '</div>'
                : '';

            const descStr = String(ev.desc || "");
            const placeStr = String(ev.place || "");
            const showPlaceSuffix = placeStr && descStr.indexOf(placeStr) === -1;

            const photos = Array.isArray(ev.photos) ? ev.photos.filter(Boolean) : [];
            let galleryHtml = "";
            if (photos.length > 0) {
                const gridColsClass = photos.length === 1
                    ? "grid-cols-1"
                    : (photos.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3");
                const photoItemsHtml = photos.map(function(src, pIdx) {
                    const caption = (ev.date ? (ev.date + " ") : "") + (ev.title || "") + (photos.length > 1 ? (" (" + (pIdx + 1) + "/" + photos.length + ")") : "");
                    return '<div class="relative group rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in shadow-2xs">' +
                        '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(caption) + '" loading="lazy" onclick="openPhotoLightbox(\'' + escapeJsSingle(src) + '\', \'' + escapeJsSingle(caption) + '\')" class="w-full aspect-video object-cover transition-transform duration-200 group-hover:scale-[1.03]" />' +
                        '<span class="pointer-events-none absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/65 text-white text-[10px] font-bold opacity-85 group-hover:opacity-100 transition">🔍</span>' +
                    '</div>';
                }).join("");
                galleryHtml = '<div class="grid ' + gridColsClass + ' gap-2 pt-2.5 border-t border-slate-200/70">' + photoItemsHtml + '</div>';
            }

            evHtml += '<div class="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition flex flex-col gap-2.5">' +
                '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">' +
                    '<div class="flex items-start gap-2.5 min-w-0">' +
                        '<span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 tabular-nums">' + (idx + 1) + '</span>' +
                        '<div class="min-w-0">' +
                            '<div class="flex items-center flex-wrap gap-1.5">' +
                                '<span class="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px] font-extrabold whitespace-nowrap">' + escapeHtml(ev.date) + '</span>' +
                                '<span class="font-extrabold text-xs sm:text-sm text-slate-900 break-keep">' + escapeHtml(ev.title) + '</span>' +
                            '</div>' +
                            '<p class="text-xs text-slate-600 mt-1 leading-relaxed break-keep">' +
                                escapeHtml(descStr) +
                                (showPlaceSuffix ? ' <span class="text-slate-400">(' + escapeHtml(placeStr) + ')</span>' : '') +
                            '</p>' +
                        '</div>' +
                    '</div>' +
                    execControls +
                '</div>' +
                galleryHtml +
            '</div>';
        });
        evCont.innerHTML = evHtml || '<div class="text-center py-6 text-slate-400 text-xs col-span-full">등록된 연간 행사가 없습니다.</div>';
    }

    // ------------------------------------------------------------------
    // Section 4: 주요 성과 & 반성 및 과제
    // ------------------------------------------------------------------
    const outCont = document.getElementById("activityOutcomesContainer");
    if (outCont && report) {
        const achItems = (report.achievements || []).map(function(txt) {
            return '<li class="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed break-keep">' +
                '<span class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✓</span>' +
                '<span>' + escapeHtml(txt) + '</span>' +
            '</li>';
        }).join("");

        const refItems = (report.reflections || []).map(function(txt) {
            return '<li class="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed break-keep">' +
                '<span class="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">!</span>' +
                '<span>' + escapeHtml(txt) + '</span>' +
            '</li>';
        }).join("");

        outCont.innerHTML =
            '<div class="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">' +
                '<div class="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">' +
                    '<h4 class="text-sm sm:text-base font-black text-emerald-900 flex items-center gap-1.5"><span>🏆</span> 주요 성과</h4>' +
                    '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">' + (report.achievements || []).length + '건</span>' +
                '</div>' +
                '<ul class="space-y-2.5">' + achItems + '</ul>' +
            '</div>' +
            '<div class="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">' +
                '<div class="flex items-center justify-between border-b border-amber-200/60 pb-2.5">' +
                    '<h4 class="text-sm sm:text-base font-black text-amber-900 flex items-center gap-1.5"><span>📌</span> 반성 및 과제</h4>' +
                    '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold">' + (report.reflections || []).length + '건</span>' +
                '</div>' +
                '<ul class="space-y-2.5">' + refItems + '</ul>' +
            '</div>';
    }

    // ------------------------------------------------------------------
    // Section 5: Special Thanks to... (※ 각사 게시 도우미)
    // ------------------------------------------------------------------
    const stCont = document.getElementById("activitySpecialThanksContainer");
    if (stCont && report) {
        let rowsHtml = "";
        (report.specialThanks || []).forEach(function(row, idx) {
            rowsHtml +=
                '<tr class="border-b border-slate-100 last:border-b-0 ' + (idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white') + ' hover:bg-indigo-50/40 transition">' +
                    '<td class="py-2.5 px-3 font-extrabold text-xs text-indigo-900 whitespace-nowrap align-top w-[160px] sm:w-[190px]">' +
                        escapeHtml(row.group) +
                    '</td>' +
                    '<td class="py-2.5 px-3 text-xs text-slate-700 leading-relaxed break-keep">' +
                        escapeHtml(row.members) +
                    '</td>' +
                '</tr>';
        });

        stCont.innerHTML =
            '<div class="overflow-x-auto table-scroll-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">' +
                '<table class="w-full min-w-[520px] text-left border-collapse rounded-xl overflow-hidden border border-slate-200">' +
                    '<thead>' +
                        '<tr class="bg-slate-100 text-slate-700 text-xs font-extrabold border-b border-slate-200">' +
                            '<th class="py-2.5 px-3 whitespace-nowrap">구분 / TF</th>' +
                            '<th class="py-2.5 px-3">함께해주신 단원 (' + escapeHtml(report.specialThanksNote || "※ 각사 게시 도우미") + ')</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' + rowsHtml + '</tbody>' +
                '</table>' +
            '</div>';
    }
}

function renderConcertFeedbackView() {
    const survey = appState.concertSurvey;
    if (!survey) return;
    const isExec = isCurrentUserExecutive();

    const concertAdminEl = document.getElementById("concertAdminActions");
    if (concertAdminEl) {
        if (isExec) {
            concertAdminEl.innerHTML = '<button type="button" onclick="openSurveyModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition flex items-center gap-1 cursor-pointer"><span>✎</span> 설문 요약 수정</button>';
        } else {
            concertAdminEl.innerHTML = '';
        }
    }

    const rateCont = document.getElementById("concertMetricsContainer");
    if (rateCont) {
        rateCont.innerHTML = 
            '<div class="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center">' +
                '<div class="text-xs text-indigo-700 font-bold">정기연주회 만족도</div>' +
                '<div class="text-2xl font-black text-indigo-950 mt-1">' + survey.regularConcertRate + '%</div>' +
                '<div class="text-[11px] text-indigo-500 mt-0.5">매우 만족 60.6%</div>' +
            '</div>' +
            '<div class="p-4 rounded-xl bg-purple-50/60 border border-purple-100 text-center">' +
                '<div class="text-xs text-purple-700 font-bold">프로그램 만족도</div>' +
                '<div class="text-2xl font-black text-purple-950 mt-1">' + survey.programRate + '%</div>' +
                '<div class="text-[11px] text-purple-500 mt-0.5">매우 만족 59.2%</div>' +
            '</div>' +
            '<div class="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">' +
                '<div class="text-xs text-emerald-700 font-bold">공연장(KBS홀) 만족도</div>' +
                '<div class="text-2xl font-black text-emerald-950 mt-1">' + survey.hallRate + '%</div>' +
                '<div class="text-[11px] text-emerald-500 mt-0.5">매우 만족 67.6%</div>' +
            '</div>' +
            '<div class="p-4 rounded-xl bg-amber-50/60 border border-amber-100 text-center">' +
                '<div class="text-xs text-amber-700 font-bold">관객 호응 만족도</div>' +
                '<div class="text-2xl font-black text-amber-950 mt-1">' + survey.audienceRate + '%</div>' +
                '<div class="text-[11px] text-amber-500 mt-0.5">매우 만족 70.4%</div>' +
            '</div>';
    }

    const songCont = document.getElementById("concertFavoriteSongsContainer");
    if (songCont) {
        let sHtml = "";
        (survey.favoriteSongs || []).forEach(function(s, i) {
            const pct = Math.round((s.votes / 71) * 100);
            sHtml += '<div class="space-y-1">' +
                '<div class="flex justify-between items-baseline gap-2 text-xs font-bold text-slate-800">' +
                    '<span class="min-w-0 break-keep">' + (i + 1) + '. ' + escapeHtml(s.title) + '</span>' +
                    '<span class="text-indigo-600 shrink-0 whitespace-nowrap">' + s.votes + '명 (' + pct + '%)</span>' +
                '</div>' +
                '<div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">' +
                    '<div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style="width: ' + pct + '%"></div>' +
                '</div>' +
            '</div>';
        });
        songCont.innerHTML = sHtml;
    }
}

function renderSettlementView() {
    const s = appState.settlement;
    if (!s) return;
    const isExec = isCurrentUserExecutive();

    const settleAdminEl = document.getElementById("settlementAdminActions");
    if (settleAdminEl) {
        if (isExec) {
            settleAdminEl.innerHTML = '<button type="button" onclick="openSettlementModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition flex items-center gap-1 cursor-pointer"><span>✎</span> 결산 내역 수정</button>';
        } else {
            settleAdminEl.innerHTML = '';
        }
    }

    const totRevEl = document.getElementById("settlementTotalRevenueDisplay");
    if (totRevEl) totRevEl.textContent = Number(s.totalRevenue).toLocaleString() + "원";
    const totExpEl = document.getElementById("settlementTotalExpenseDisplay");
    if (totExpEl) totExpEl.textContent = Number(s.totalExpense).toLocaleString() + "원";
    const balEl = document.getElementById("settlementBalanceDisplay");
    if (balEl) balEl.textContent = Number(s.balance).toLocaleString() + "원";

    const revCont = document.getElementById("settlementRevenueTableBody");
    if (revCont) {
        let html = "";
        (s.revenueItems || []).forEach(function(item, i) {
            html += '<tr class="border-b border-slate-100 text-xs">' +
                '<td class="py-2.5 px-3 text-slate-500 font-semibold">' + (i + 1) + '</td>' +
                '<td class="py-2.5 px-3 font-bold text-slate-900">' + escapeHtml(item.name) + '</td>' +
                '<td class="py-2.5 px-2.5 sm:px-3 text-right font-extrabold text-indigo-700 whitespace-nowrap">' + Number(item.amount).toLocaleString() + '원</td>' +
                '<td class="py-2.5 px-3 text-slate-500">' + escapeHtml(item.note) + '</td>' +
            '</tr>';
        });
        revCont.innerHTML = html;
    }

    const expCont = document.getElementById("settlementExpenseTableBody");
    if (expCont) {
        let html = "";
        (s.expenseItems || []).forEach(function(item, i) {
            html += '<tr class="border-b border-slate-100 text-xs">' +
                '<td class="py-2.5 px-3 text-slate-500 font-semibold">' + (i + 1) + '</td>' +
                '<td class="py-2.5 px-3 font-bold text-slate-900">' + escapeHtml(item.name) + '</td>' +
                '<td class="py-2.5 px-2.5 sm:px-3 text-right font-extrabold text-rose-700 whitespace-nowrap">' + Number(item.amount).toLocaleString() + '원</td>' +
                '<td class="py-2.5 px-3 text-slate-500">' + escapeHtml(item.note) + '</td>' +
            '</tr>';
        });
        expCont.innerHTML = html;
    }
}

function renderAgendaStepper() {
    const isExec = isCurrentUserExecutive();
    const addActionEl = document.getElementById("agendaAdminAddAction");
    if (addActionEl) {
        if (isExec) {
            addActionEl.innerHTML = '<button type="button" onclick="openAgendaModal()" class="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition flex items-center gap-1 cursor-pointer"><span>+</span> 새 개정안 추가</button>';
        } else {
            addActionEl.innerHTML = '';
        }
    }

    const headerTitle = document.getElementById("agendaListHeaderTitle");
    if (headerTitle) {
        headerTitle.textContent = "단칙 개정 상정 안건 목록 (총 " + (appState.agendas || []).length + "개 안건)";
    }
    const container = document.getElementById("agendaStepperContainer");
    if (!container) return;
    let html = "";
    (appState.agendas || []).forEach(function(ag, i) {
        const isActive = ag.id === appState.activeAgendaId;
        const agNo = ag.no || ag.agendaNo || ag.number || (i + 1);
        const hasVoted = Boolean(appState.currentVoterId && (ag.memberVotes || {})[appState.currentVoterId]);
        const isLocked = Boolean(ag.isLocked || ag.status === "closed" || ag.status === "locked");
        
        let statusBadge = "";
        if (isLocked) {
            statusBadge = '<span class="text-[10px]" title="의결 확정(잠금)">🔒</span>';
        } else if (hasVoted) {
            statusBadge = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="투표 완료"></span>';
        }

        html += '<button type="button" onclick="selectAgenda(\'' + (ag.id || ('ag-' + (i + 1))) + '\')" class="shrink-0 px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ' +
            (isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50') + '">' +
            '<span>안건 ' + agNo + '</span>' +
            statusBadge +
        '</button>';
    });
    container.innerHTML = html;
}

function renderActiveVotingView() {
    const ag = getActiveAgenda();
    if (!ag) return;
    const isExec = isCurrentUserExecutive();
    const tallies = getAgendaTallies(ag);
    const myVote = appState.currentVoterId ? (ag.memberVotes || {})[appState.currentVoterId] : null;
    const isLocked = Boolean(ag.isLocked || ag.status === "closed" || ag.status === "locked");
    const agNo = ag.no || ag.agendaNo || ag.number || "";

    // 1. Dynamic bylaw admin control bar container (above stepper)
    const bylawAdminBar = document.getElementById("bylawAdminControlBarContainer");
    if (bylawAdminBar) {
        if (isExec) {
            const totalAg = (appState.agendas || []).length;
            const lockedAg = (appState.agendas || []).filter(function(a) { return a.isLocked || a.status === "closed" || a.status === "locked"; }).length;
            const votingAg = totalAg - lockedAg;

            bylawAdminBar.innerHTML = 
                '<div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border-2 border-amber-500/40 space-y-3 mb-2">' +
                    '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/40 pb-2.5">' +
                        '<div class="flex items-center gap-2 flex-wrap">' +
                            '<span class="text-sm font-black text-amber-300">👑 단칙 개정 총괄 제어 대시보드</span>' +
                            '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">운영진 모드</span>' +
                            '<span class="text-xs text-slate-300">총 ' + totalAg + '개 안건 중 <strong class="text-amber-300">' + lockedAg + '개 확정(마감)</strong> / <strong class="text-emerald-400">' + votingAg + '개 표결 중</strong></span>' +
                        '</div>' +
                        '<div class="flex items-center gap-2 flex-wrap">' +
                            '<button type="button" onclick="toggleAllAgendasLock(' + (lockedAg < totalAg) + ')" class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ' +
                                (lockedAg < totalAg ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white') + '">' +
                                (lockedAg < totalAg ? '🔒 전체 안건 일괄 마감(잠금)' : '🔓 전체 안건 일괄 재개') +
                            '</button>' +
                            '<button type="button" onclick="openAgendaModal()" class="px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition flex items-center gap-1 cursor-pointer">' +
                                '<span>+</span> 새 개정안 상정' +
                            '</button>' +
                            '<button id="btnResetAllAgendaVotesTop" type="button" onclick="resetAgendaVotesOnly()" class="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-xs transition flex items-center gap-1 cursor-pointer" title="모든 단칙 개정안(12건)의 투표 기록을 0표로 일괄 초기화합니다">' +
                                '<span>🗑️</span> 투표 전체 초기화 (0표 리셋)' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else {
            bylawAdminBar.innerHTML = '';
        }
    }

    // 2. Admin actions on active agenda
    const adminActionsEl = document.getElementById("activeAgendaAdminActions");
    if (adminActionsEl) {
        if (isExec) {
            adminActionsEl.innerHTML = 
                '<div class="flex items-center gap-1.5 flex-wrap justify-end">' +
                    '<button type="button" onclick="toggleAgendaLock(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ' +
                        (isLocked ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300') + '">' +
                        '<span>' + (isLocked ? '🔓' : '🔒') + '</span> ' +
                        '<span>' + (isLocked ? '투표 재개 (잠금 해제)' : '투표 마감 및 결과 확정 (잠금)') + '</span>' +
                    '</button>' +
                    '<button type="button" onclick="openAgendaModal(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer flex items-center gap-1">✎ 안건 수정</button>' +
                    '<button type="button" onclick="deleteAgenda(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1">🗑️ 안건 삭제</button>' +
                    '<button id="btnResetSingleAgendaVote" type="button" onclick="resetSingleAgendaVotes(\'' + ag.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer flex items-center gap-1" title="현재 선택된 이 안건의 투표만 0표로 초기화합니다">' +
                        '<span>↺</span> 이 안건 투표 초기화' +
                    '</button>' +
                '</div>';
        } else {
            adminActionsEl.innerHTML = 
                '<div class="flex items-center gap-1.5 flex-wrap justify-end">' +
                    '<button type="button" onclick="resetSingleAgendaVotes(\'' + ag.id + '\')" class="px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer flex items-center gap-1" title="운영진 인증 후 이 안건의 투표를 초기화합니다">' +
                        '<span>↺</span> 투표 초기화' +
                    '</button>' +
                '</div>';
        }
    }

    const titleEl = document.getElementById("activeAgendaTitle");
    if (titleEl) titleEl.textContent = ag.title || ag.name || ("안건 제" + agNo + "호");
    const catEl = document.getElementById("activeAgendaCategory");
    if (catEl) {
        const catStr = ag.category || ag.targetArticle || ag.articleNo || "단칙 개정";
        const authorStr = ag.author || ag.proposer || "운영진 발의";
        catEl.textContent = catStr + " · " + authorStr;
    }
    const descEl = document.getElementById("activeAgendaSummary");
    if (descEl) descEl.textContent = ag.summary || ag.description || "";
    const reasonEl = document.getElementById("activeAgendaReason");
    if (reasonEl) reasonEl.textContent = ag.proposalReason || ag.reason || "";
    const beforeEl = document.getElementById("activeAgendaBefore");
    if (beforeEl) beforeEl.textContent = ag.beforeText || ag.before || "";
    const afterEl = document.getElementById("activeAgendaAfter");
    if (afterEl) afterEl.textContent = ag.afterText || ag.after || "";

    // Tally numbers
    const appEl = document.getElementById("activeAgendaApproveCount");
    if (appEl) appEl.textContent = tallies.approve;
    const rejEl = document.getElementById("activeAgendaRejectCount");
    if (rejEl) rejEl.textContent = tallies.reject;
    const absEl = document.getElementById("activeAgendaAbstainCount");
    if (absEl) absEl.textContent = tallies.abstain;
    const totalVotedEl = document.getElementById("activeAgendaTotalVoted");
    if (totalVotedEl) totalVotedEl.textContent = tallies.totalVoted;
    const passThreshEl = document.getElementById("activeAgendaPassThreshold");
    if (passThreshEl) passThreshEl.textContent = tallies.majorityThreshold;

    // Vote result status badge
    const statusEl = document.getElementById("activeAgendaResultStatus");
    if (statusEl) {
        if (isLocked) {
            statusEl.className = tallies.isAdopted
                ? "px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"
                : "px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1";
            statusEl.textContent = "🔒 의결 확정 (" + (tallies.isAdopted ? "가결 확정" : "부결 확정") + " · 투표 마감)";
        } else if (tallies.isAdopted) {
            statusEl.className = "px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1";
            statusEl.textContent = "가결 요건 충족 (2/3 정족수 충족)";
        } else {
            statusEl.className = "px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1";
            statusEl.textContent = "표결 진행 중 (가결 기준: " + tallies.majorityThreshold + "표↑)";
        }
    }

    // My vote indicator
    const myVoteEl = document.getElementById("myVoteStatusNotice");
    const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
    if (myVoteEl) {
        if (isLocked) {
            if (myVote) {
                myVoteEl.innerHTML = '<span class="text-xs font-black text-indigo-800">🔒 나의 최종 의결: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong> (확정)</span>';
            } else {
                myVoteEl.innerHTML = '<span class="text-xs font-bold text-rose-600">🔒 투표가 공식 마감되어 더 이상 투표에 참여할 수 없습니다.</span>';
            }
        } else {
            if (myVote) {
                myVoteEl.innerHTML = '<div class="flex items-center justify-between gap-2 flex-wrap">' +
                    '<span class="text-xs font-bold text-indigo-700">✓ 본인 투표 완료: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong>로 의결권을 행사하셨습니다.</span>' +
                    '<button type="button" onclick="cancelAgendaVote(\'' + escapeHtml(ag.id) + '\')" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-300 font-extrabold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs">↩️ 투표 취소</button>' +
                '</div>';
            } else {
                myVoteEl.innerHTML = '<span class="text-xs font-semibold text-slate-500">아직 본 안건에 투표하지 않으셨습니다. 아래 버튼을 눌러 투표하세요. (선택한 항목을 다시 누르면 취소됩니다)</span>';
            }
        }
    }

    // Voting Action Buttons (Lock enforcement)
    const btnBox = document.getElementById("activeAgendaVotingButtonsContainer");
    if (btnBox) {
        if (isLocked) {
            btnBox.innerHTML = 
                '<div class="col-span-3 p-4 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 text-center space-y-1">' +
                    '<div class="flex items-center justify-center gap-2 text-slate-800 font-black text-sm">' +
                        '<span class="text-base">🔒</span>' +
                        '<span>투표가 마감되어 의결이 확정되었습니다 (변경 불가)</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-500 font-medium">본 안건의 의결권 행사가 종료되어 최종 표결 결과가 확정되었습니다.</p>' +
                '</div>';
        } else {
            const isApp = myVote === "approve";
            const isRej = myVote === "reject";
            const isAbs = myVote === "abstain";
            btnBox.innerHTML = 
                '<button type="button" onclick="voteAgenda(\'approve\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ' +
                    (isApp ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white') + '">' +
                    '<span>✓</span>' +
                    '<span>찬성' + (isApp ? ' (선택됨)' : '') + '</span>' +
                '</button>' +
                '<button type="button" onclick="voteAgenda(\'reject\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ' +
                    (isRej ? 'bg-rose-700 text-white ring-2 ring-rose-400' : 'bg-rose-600 hover:bg-rose-500 text-white') + '">' +
                    '<span>✕</span>' +
                    '<span>반대' + (isRej ? ' (선택됨)' : '') + '</span>' +
                '</button>' +
                '<button type="button" onclick="voteAgenda(\'abstain\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ' +
                    (isAbs ? 'bg-slate-800 text-white ring-2 ring-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white') + '">' +
                    '<span>-</span>' +
                    '<span>기권' + (isAbs ? ' (선택됨)' : '') + '</span>' +
                '</button>' +
                (myVote
                    ? ('<button id="btnCancelAgendaVote" type="button" onclick="cancelAgendaVote(\'' + escapeHtml(ag.id) + '\')" class="col-span-3 min-h-[46px] py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border-2 border-rose-200 font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">' +
                        '<span>↩️</span>' +
                        '<span>본인 투표 취소 (미투표 상태로 되돌리기)</span>' +
                    '</button>')
                    : '');
        }
    }

    // Prev / Next Agenda Navigation Footer
    const bottomNavEl = document.getElementById("agendaBottomNavContainer");
    if (bottomNavEl) {
        const agendasList = Array.isArray(appState.agendas) ? appState.agendas : [];
        const totalCount = agendasList.length;
        const currentIdx = agendasList.findIndex(function(a) { return a && a.id === ag.id; });
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < totalCount - 1;
        const displayPos = (currentIdx >= 0 ? currentIdx + 1 : 1) + " / " + (totalCount || 1);

        bottomNavEl.innerHTML =
            '<button id="btnPrevAgenda" type="button" onclick="navigateAgendaStep(-1)" ' +
                (hasPrev ? '' : 'disabled aria-disabled="true" ') +
                'class="flex-1 sm:flex-initial min-h-[44px] px-3 sm:px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap ' +
                (hasPrev
                    ? 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border-slate-300 shadow-xs cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60') + '">' +
                '<span>←</span>' +
                '<span>이전 안건</span>' +
            '</button>' +
            '<span id="agendaBottomNavCounter" class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold tabular-nums shrink-0">' +
                displayPos +
            '</span>' +
            '<button id="btnNextAgenda" type="button" onclick="navigateAgendaStep(1)" ' +
                (hasNext ? '' : 'disabled aria-disabled="true" ') +
                'class="flex-1 sm:flex-initial min-h-[44px] px-3 sm:px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap ' +
                (hasNext
                    ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white border-indigo-600 shadow-sm cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60') + '">' +
                '<span>다음 안건</span>' +
                '<span>→</span>' +
            '</button>';
    }
}

function renderElectionView() {
    const elec = appState.election;
    if (!elec) return;
    const isExec = isCurrentUserExecutive();
    const tallies = getElectionTallies();
    const isSingle = elec.mode === "single";
    const isClosed = Boolean(elec.status === "closed" || elec.isLocked);

    // 1. Render "👑 단장 선거 총괄 제어 대시보드" at top of election view if executive
    const barCont = document.getElementById("electionAdminControlBarContainer");
    if (barCont) {
        if (isExec) {
            barCont.innerHTML = 
                '<div id="electionAdminControlBar" class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border-2 border-amber-500/40 space-y-3.5 mb-2">' +
                    '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/40 pb-2.5">' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="text-sm font-black text-amber-300">👑 단장 선거 총괄 제어 대시보드</span>' +
                            '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">운영진 모드</span>' +
                        '</div>' +
                        '<div class="flex items-center gap-2 flex-wrap">' +
                            '<button type="button" onclick="openCandidateModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer">' +
                                '<span>+</span> 단장 후보자 등록' +
                            '</button>' +
                            '<button id="btnResetAllElectionVotesTop" type="button" onclick="resetElectionVotesOnly()" class="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer" title="단장 선거의 모든 실시간 투표 기록을 0표로 초기화합니다">' +
                                '<span>🗑️</span> 단장 투표 초기화 (0표 리셋)' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">' +
                        '<!-- 1) 선거 방식 전환 스위치 -->' +
                        '<div class="bg-black/30 p-3 rounded-xl border border-white/10 space-y-1.5">' +
                            '<div class="text-[11px] font-bold text-indigo-300 flex items-center justify-between">' +
                                '<span>선거 방식 전환</span>' +
                                '<span class="text-[10px] text-slate-400">현재: ' + (isSingle ? '단독 출마 찬반' : '다자 경선') + '</span>' +
                            '</div>' +
                            '<div class="grid grid-cols-2 gap-2">' +
                                '<button type="button" onclick="setElectionMode(\'single\')" class="py-2 px-2.5 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (isSingle ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400' : 'bg-white/10 text-slate-300 hover:bg-white/20') + '">' +
                                    '✓ 단독 출마 찬반투표' +
                                '</button>' +
                                '<button type="button" onclick="setElectionMode(\'multi\')" class="py-2 px-2.5 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (!isSingle ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400' : 'bg-white/10 text-slate-300 hover:bg-white/20') + '">' +
                                    '✓ 다자 경선 투표' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<!-- 2) 투표 상태 및 당선공고 제어 -->' +
                        '<div class="bg-black/30 p-3 rounded-xl border border-white/10 space-y-1.5">' +
                            '<div class="text-[11px] font-bold text-amber-300 flex items-center justify-between">' +
                                '<span>선거 투표 마감 및 공고 제어</span>' +
                                '<span class="text-[10px] ' + (isClosed ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold') + '">' + (isClosed ? '🔒 투표 마감(의결 확정)' : '● 표결 진행중') + '</span>' +
                            '</div>' +
                            '<div class="grid grid-cols-2 gap-2">' +
                                '<button type="button" onclick="toggleElectionStatus()" class="py-2 px-2 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (isClosed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white') + '">' +
                                    (isClosed ? '🔓 투표 재개' : '🔒 단장 선거 마감 및 결과 확정') +
                                '</button>' +
                                '<button type="button" onclick="toggleWinnerPublic()" class="py-2 px-2 rounded-lg text-xs font-black text-center transition cursor-pointer ' +
                                    (appState.winnerPagePublic ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600') + '">' +
                                    (appState.winnerPagePublic ? '📢 당선공고 전체공개 중' : '🔒 당선공고 비공개') +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else {
            barCont.innerHTML = "";
        }
    }

    const singleBox = document.getElementById("electionSingleModeView");
    const multiBox = document.getElementById("electionMultiModeView");

    if (isSingle) {
        if (singleBox) singleBox.classList.remove("hidden");
        if (multiBox) multiBox.classList.add("hidden");

        const cand = (elec.candidates && elec.candidates.length > 0) ? elec.candidates[0] : null;
        if (cand) {
            const nameEl = document.getElementById("singleCandName");
            if (nameEl) nameEl.textContent = cand.name + " (" + cand.gen + " · " + cand.part + ")";
            const imgEl = document.getElementById("singleCandPhoto");
            if (imgEl && cand.photo) imgEl.src = cand.photo;

            // Render Recommendation (추천인 추천사)
            const recomEl = document.getElementById("singleCandRecommendation");
            if (recomEl) {
                const rawRecom = cand.recommendation || "삼성 디지털시티 합창단 단장을 역임하신 경험이 있으며, 본 합창단에서도 부단장으로 활동하시며 리더십과 운영 역량을 보여주셨습니다. 합창단에 대한 애정과 책임감이 크고, 풍부한 경험을 바탕으로 우리 합창단을 안정적으로 이끌어 가실 적임자라고 생각합니다.";
                const recomText = rawRecom.replace(/타 합창단/g, "삼성 디지털시티 합창단");
                recomEl.textContent = "“" + recomText.replace(/^[“"\s]+|[”"\s]+$/g, "") + "”";
            }

            // Render Manifesto (단장 후보 출마사)
            const mTitleEl = document.getElementById("singleCandManifestoTitle");
            if (mTitleEl && cand.manifestoTitle) {
                mTitleEl.innerHTML = '<span class="text-indigo-600">“</span>' + escapeHtml(cand.manifestoTitle) + '<span class="text-indigo-600">”</span>';
            }
            const mBodyEl = document.getElementById("singleCandManifestoBody");
            if (mBodyEl && cand.manifesto) {
                const paras = cand.manifesto.split(/\n\s*\n/).map(function(p) { return p.trim(); }).filter(Boolean);
                mBodyEl.innerHTML = paras.map(function(p, idx) {
                    const isLast = (idx === paras.length - 1);
                    return '<p class="' + (isLast ? 'font-semibold text-slate-800 pt-1' : 'leading-relaxed') + '">' +
                        escapeHtml(p).replace(/\n/g, '<br/>') +
                    '</p>';
                }).join('');
            }

            // Render Pledges as cleanly separated cards
            const pledgeCont = document.getElementById("singleCandPledgeContainer");
            if (pledgeCont) {
                let pledgeItems = [];
                if (Array.isArray(cand.pledge)) {
                    pledgeItems = cand.pledge;
                } else if (typeof cand.pledge === "string") {
                    pledgeItems = cand.pledge.split(/\n+/).map(function(s){ return s.trim(); }).filter(Boolean);
                    if (pledgeItems.length <= 1) {
                        pledgeItems = cand.pledge.split(/(?=\d+\.\s*)/).map(function(s){ return s.trim(); }).filter(Boolean);
                    }
                }
                if (pledgeItems.length === 0) {
                    pledgeItems = [
                        "1. '음악의 본질'에 충실한 한우리: 단원 개개인이 한 단계 도약하고 음악적으로 성장하는 튼튼한 토대 마련",
                        "2. '우리는 왜 노래하는가': 정기연주회 커튼콜의 벅찬 감동과 진정한 성취감을 나누는 치열한 고민",
                        "3. 무대와 교류의 확장: 단원들의 꿈과 끼를 펼칠 다양한 무대 및 대외 교류 추진으로 음악적 스펙트럼 확대",
                        "4. 소통과 경청의 동행: 단원·운영진과 손잡고 따끔한 비판도 자양분 삼아 두 발로 정직하게 뛰는 리더십"
                    ];
                }
                pledgeCont.innerHTML = pledgeItems.map(function(item, idx) {
                    const cleanText = item.replace(/^\d+\.\s*/, "").replace(/안산시립합창단\s*/g, "").trim();
                    const num = idx + 1;
                    return '<div class="p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-2.5">' +
                        '<span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">' + num + '</span>' +
                        '<p class="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">' + cleanText + '</p>' +
                    '</div>';
                }).join('');
            }

            // Render Career as cleanly separated bullet cards
            const careerCont = document.getElementById("singleCandCareerContainer");
            if (careerCont) {
                let careerItems = [];
                if (Array.isArray(cand.career)) {
                    careerItems = cand.career;
                } else if (typeof cand.career === "string") {
                    careerItems = cand.career.split(/[,\n]+/).map(function(s){ return s.trim(); }).filter(Boolean);
                }
                if (careerItems.length === 0) {
                    careerItems = [
                        "2018년 삼성한우리합창단 15기 베이스(B1) 입단 및 정단원 활동",
                        "정기연주회 총 7회 출연 (단칙 제11조 제3항 피선거권 요건 충족)",
                        "2020년 삼성한우리합창단 부단장 역임 (운영진 리더십 역량 검증)",
                        "삼성 디지털시티 합창단 단장 역임 (풍부한 합창단 운영 및 통솔 경험 보유)",
                        "2027년 삼성한우리합창단 신임 단장 단독 입후보"
                    ];
                }
                careerCont.innerHTML = careerItems.map(function(item) {
                    const cleanText = item.replace(/안산시립합창단\s*/g, "").replace(/타 합창단/g, "삼성 디지털시티 합창단").trim();
                    return '<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">' +
                        '<span class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">✓</span>' +
                        '<p class="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium">' + cleanText + '</p>' +
                    '</div>';
                }).join('');
            }

            // Single candidate admin buttons (수정 / 삭제)
            const adminSingleBtnEl = document.getElementById("singleCandAdminControls");
            if (adminSingleBtnEl) {
                if (isExec) {
                    adminSingleBtnEl.innerHTML = 
                        '<div class="flex items-center gap-1.5">' +
                            '<button type="button" onclick="openCandidateModal(\'' + cand.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer">✎ 후보 정보 수정</button>' +
                            '<button type="button" onclick="deleteCandidate(\'' + cand.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 후보 삭제</button>' +
                        '</div>';
                } else {
                    adminSingleBtnEl.innerHTML = '';
                }
            }
        }

        const appEl = document.getElementById("singleCandApproveCount");
        if (appEl) appEl.textContent = tallies.approve;
        const rejEl = document.getElementById("singleCandRejectCount");
        if (rejEl) rejEl.textContent = tallies.reject;
        const absEl = document.getElementById("singleCandAbstainCount");
        if (absEl) absEl.textContent = tallies.abstain;

        const myVote = appState.currentVoterId ? (elec.singleVotes.memberVotes || {})[appState.currentVoterId] : null;
        const statusEl = document.getElementById("myElectionVoteStatus");
        const labelMap = { approve: "찬성", reject: "반대", abstain: "기권" };
        if (statusEl) {
            if (isClosed) {
                if (myVote) {
                    statusEl.innerHTML = '<span class="text-xs font-black text-purple-800">🔒 나의 최종 의결: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong> (확정)</span>';
                } else {
                    statusEl.innerHTML = '<span class="text-xs font-bold text-rose-600">🔒 단장 선거 투표가 공식 마감되었습니다.</span>';
                }
            } else {
                if (myVote) {
                    statusEl.innerHTML = '<div class="flex items-center justify-between gap-2 flex-wrap">' +
                        '<span class="text-xs font-bold text-purple-700">✓ 단장 선거 투표 완료: <strong class="underline">' + (labelMap[myVote] || myVote) + '</strong></span>' +
                        '<button type="button" onclick="cancelElectionVote()" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-300 font-extrabold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs">↩️ 투표 취소</button>' +
                    '</div>';
                } else {
                    statusEl.innerHTML = '<span class="text-xs font-semibold text-slate-500">아직 단장 선거에 투표하지 않으셨습니다. 아래 버튼을 눌러 투표하세요. (선택한 항목을 다시 누르면 취소됩니다)</span>';
                }
            }
        }

        // Single vote action buttons container
        const btnBox = document.getElementById("singleElectionVoteButtonsContainer");
        if (btnBox) {
            if (isClosed) {
                btnBox.innerHTML = 
                    '<div class="col-span-3 p-4 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 text-center space-y-1">' +
                        '<div class="flex items-center justify-center gap-2 text-slate-800 font-black text-sm">' +
                            '<span class="text-base">🔒</span>' +
                            '<span>단장 선거 투표가 마감되었습니다 (변경 불가)</span>' +
                        '</div>' +
                        '<p class="text-xs text-slate-500 font-medium">2026년도 신임 단장 선출 의결권 행사가 공식 종료되어 결과가 확정되었습니다.</p>' +
                    '</div>';
            } else {
                const isApp = myVote === "approve";
                const isRej = myVote === "reject";
                const isAbs = myVote === "abstain";
                btnBox.innerHTML = 
                    '<button type="button" onclick="voteElectionSingle(\'approve\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer ' +
                        (isApp ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white') + '">' +
                        '후보 찬성' + (isApp ? ' (선택됨)' : '') +
                    '</button>' +
                    '<button type="button" onclick="voteElectionSingle(\'reject\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer ' +
                        (isRej ? 'bg-rose-700 text-white ring-2 ring-rose-400' : 'bg-rose-600 hover:bg-rose-500 text-white') + '">' +
                        '후보 반대' + (isRej ? ' (선택됨)' : '') +
                    '</button>' +
                    '<button type="button" onclick="voteElectionSingle(\'abstain\')" class="py-3 rounded-xl font-extrabold text-sm transition shadow-sm cursor-pointer ' +
                        (isAbs ? 'bg-slate-800 text-white ring-2 ring-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white') + '">' +
                        '기권' + (isAbs ? ' (선택됨)' : '') +
                    '</button>' +
                    (myVote
                        ? ('<button id="btnCancelElectionVoteSingle" type="button" onclick="cancelElectionVote()" class="col-span-3 min-h-[46px] py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border-2 border-rose-200 font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">' +
                            '<span>↩️</span>' +
                            '<span>본인 투표 취소 (미투표 상태로 되돌리기)</span>' +
                        '</button>')
                        : '');
            }
        }
    } else {
        if (singleBox) singleBox.classList.add("hidden");
        if (multiBox) multiBox.classList.remove("hidden");

        const cardsCont = document.getElementById("multiCandidatesGrid");
        if (cardsCont) {
            let html = "";
            const activeCands = getActiveCandidates();
            const myVote = appState.currentVoterId ? (elec.multiMemberVotes || {})[appState.currentVoterId] : null;

            activeCands.forEach(function(c) {
                const count = (tallies.counts && tallies.counts[c.id] !== undefined) ? tallies.counts[c.id] : (c.baseVotes || 0);
                const isSelected = myVote === c.id;

                const editBtnHtml = isExec ? 
                    ('<div class="flex items-center gap-1 shrink-0">' +
                        '<button type="button" onclick="openCandidateModal(\'' + c.id + '\')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 hover:bg-indigo-100 text-indigo-700 border border-slate-200 transition cursor-pointer">✎ 수정</button>' +
                        '<button type="button" onclick="deleteCandidate(\'' + c.id + '\')" class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 삭제</button>' +
                    '</div>') : '';

                const voteBtnHtml = isClosed ?
                    (isSelected 
                        ? '<span class="px-3 py-1 rounded-lg text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-300">🔒 최종 선택 (확정)</span>'
                        : '<span class="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-400">🔒 투표 마감</span>') :
                    ('<button type="button" onclick="voteElectionMulti(\'' + c.id + '\')" class="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ' +
                        (isSelected ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-purple-100') + '">' +
                        (isSelected ? '✓ 선택됨' : '투표하기') +
                    '</button>');

                html += '<div class="p-4 rounded-xl border ' + (isSelected ? 'border-2 border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-white') + ' shadow-xs space-y-3 flex flex-col justify-between">' +
                    '<div class="space-y-3">' +
                        '<div class="flex items-start justify-between gap-2">' +
                            '<div class="flex items-center gap-3">' +
                                '<img src="' + c.photo + '" alt="' + escapeHtml(c.name) + '" class="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" onerror="this.src=\'assets/cand_1.jpg\'">' +
                                '<div>' +
                                    '<h4 class="text-sm font-extrabold text-slate-900">' + escapeHtml(c.name) + ' <span class="text-xs text-slate-500 font-normal">(' + escapeHtml(c.gen) + ' · ' + escapeHtml(c.part) + ')</span></h4>' +
                                    '<p class="text-xs text-purple-700 font-semibold">' + escapeHtml(c.title || c.company || '') + '</p>' +
                                '</div>' +
                            '</div>' +
                            editBtnHtml +
                        '</div>' +
                        '<p class="text-xs text-slate-600 break-keep">' + escapeHtml(c.pledge) + '</p>' +
                        (c.career ? ('<p class="text-[11px] text-slate-400 break-keep">' + escapeHtml(c.career) + '</p>') : '') +
                    '</div>' +
                    '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">' +
                        '<span class="text-sm font-black text-slate-900">' + count + '표</span>' +
                        voteBtnHtml +
                    '</div>' +
                '</div>';
            });
            cardsCont.innerHTML = html || '<div class="col-span-3 text-center py-8 text-slate-400 text-xs">등록된 후보자가 없습니다. 운영진 관리 바에서 후보자를 추가해주세요.</div>';

            const multiFooter = document.getElementById("multiElectionVoteFooter");
            if (multiFooter) {
                const selectedCand = myVote ? activeCands.find(function(c) { return c.id === myVote; }) : null;
                if (isClosed) {
                    multiFooter.innerHTML =
                        '<div class="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs font-bold text-slate-600">' +
                            (selectedCand
                                ? ('🔒 단장 선거 투표가 마감되었습니다. (최종 선택: <strong class="text-purple-800">' + escapeHtml(selectedCand.name) + '</strong>)')
                                : '🔒 단장 선거 투표가 공식 마감되었습니다.') +
                        '</div>';
                } else if (myVote) {
                    multiFooter.innerHTML =
                        '<div class="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800 flex items-center justify-between gap-2 flex-wrap">' +
                            '<span>✓ 단장 선거 투표 완료: <strong class="underline">' + escapeHtml(selectedCand ? selectedCand.name : myVote) + '</strong></span>' +
                            '<button type="button" onclick="cancelElectionVote()" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs">↩️ 투표 취소</button>' +
                        '</div>' +
                        '<button id="btnCancelElectionVoteMulti" type="button" onclick="cancelElectionVote()" class="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border-2 border-rose-200 font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">' +
                            '<span>↩️</span>' +
                            '<span>본인 투표 취소 (미투표 상태로 되돌리기)</span>' +
                        '</button>';
                } else {
                    multiFooter.innerHTML = '';
                }
            }
        }
    }
}

function renderWinnerView() {
    const elec = appState.election;
    if (!elec) return;
    const tallies = getElectionTallies();
    const winner = tallies.winner || elec.candidates[0];

    const nameEl = document.getElementById("winnerCandidateName");
    if (nameEl) nameEl.textContent = winner.name;
    const titleEl = document.getElementById("winnerCandidateTitle");
    if (titleEl) titleEl.textContent = "2027 삼성한우리합창단 신임 단장 (" + winner.gen + " · " + winner.part + ")";
    const votesEl = document.getElementById("winnerVoteSummary");
    if (votesEl) {
        if (tallies.mode === "single") {
            const pct = tallies.totalVoted > 0 ? Math.round((tallies.approve / tallies.totalVoted) * 100) : 0;
            votesEl.textContent = "찬성 " + tallies.approve + "표 / 반대 " + tallies.reject + "표 / 기권 " + tallies.abstain + "표 (득표율 " + pct + "%)";
        } else {
            votesEl.textContent = "최다 득표 " + tallies.topVotes + "표로 당선 확정";
        }
    }
}

function renderCurrentBylawsView() {
    const isExec = (typeof isCurrentUserExecutive === "function") ? isCurrentUserExecutive() : Boolean(appState.isAdminAuthenticated);

    // 단칙 헤더 운영진 제어 버튼
    const bHeader = document.getElementById("bylawsAdminHeaderControls");
    if (bHeader) {
        if (isExec) {
            bHeader.innerHTML =
                '<span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 shrink-0">🔧 운영진 편집 모드</span>' +
                '<button type="button" onclick="openEditClauseModal()" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1 shrink-0 cursor-pointer">+ 조문 추가</button>';
        } else {
            bHeader.innerHTML = "";
        }
    }

    const uploadBtn = document.getElementById("btnBylawFileUpload");
    if (uploadBtn) {
        if (isExec) uploadBtn.classList.remove("hidden");
        else uploadBtn.classList.add("hidden");
    }

    const container = document.getElementById("currentBylawsClausesContainer");
    if (!container) return;
    const chFilter = appState.bylawViewerChapter || "all";
    const q = (appState.bylawSearchQuery || "").trim();

    const filtered = (appState.bylaws || []).filter(function(cl) {
        if (chFilter !== "all" && cl.chapter.indexOf(chFilter) === -1) return false;
        if (q) {
            return matchesSearch([cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
        }
        return true;
    });

    let html = "";
    filtered.forEach(function(cl) {
        const execControls = isExec
            ? '<div class="flex items-center gap-1.5 shrink-0">' +
                '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 조문 수정</button>' +
                '<button type="button" onclick="deleteClauseItem(\'' + cl.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
              '</div>'
            : '';

        html += '<div id="' + cl.id + '" class="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs space-y-2">' +
            '<div class="flex items-center justify-between gap-2">' +
                '<div class="flex items-center gap-2">' +
                    '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700">' + escapeHtml(cl.chapter) + '</span>' +
                    '<h4 class="text-sm font-extrabold text-slate-900">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</h4>' +
                '</div>' +
                execControls +
            '</div>' +
            '<div class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line break-keep">' + highlightMatch(cl.content, q) + '</div>' +
            (cl.lastAmended ? '<div class="text-[11px] text-slate-400">비고: ' + escapeHtml(cl.lastAmended) + '</div>' : '') +
        '</div>';
    });
    container.innerHTML = html || '<div class="text-center py-8 text-slate-400 text-xs">일치하는 단칙 조항이 없습니다.</div>';
}

function renderFullSearchView() {}
function renderDrawerSearchResults() {}

function getFirebaseSyncStatusSafe() {
    if (typeof window !== "undefined" && window.FirebaseSync && typeof window.FirebaseSync.getStatus === "function") {
        return window.FirebaseSync.getStatus();
    }
    return { connected: false, mode: "local", error: null, lastSyncAt: null, projectId: "" };
}

function getFirebaseErrorDiagnosticHint(errorMsg) {
    const raw = String(errorMsg || "").toLowerCase();
    if (!raw) return "";
    if (raw.indexOf("permission-denied") !== -1 || raw.indexOf("insufficient permissions") !== -1 || raw.indexOf("permission") !== -1) {
        return "Firestore 보안 규칙을 게시했는지 확인하세요.";
    }
    if (raw.indexOf("not-found") !== -1 || raw.indexOf("not found") !== -1 || raw.indexOf("offline") !== -1 || raw.indexOf("unavailable") !== -1 || raw.indexOf("failed-precondition") !== -1 || raw.indexOf("database") !== -1) {
        return "Firestore Database가 생성되었는지 확인하세요.";
    }
    return "Firebase Console에서 Firestore Database 생성 여부 및 보안 규칙을 확인하세요.";
}

function renderFirebaseSyncStatusHtml() {
    const st = getFirebaseSyncStatusSafe();
    const projectSuffix = st.projectId ? " (" + escapeHtml(st.projectId) + ")" : "";

    let badgeHtml = "";
    let hintHtml = "";
    if (st.mode === "cloud" && st.connected) {
        badgeHtml =
            '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold">' +
                '<span>🟢</span>' +
                '<span>Firebase 실시간 동기화 연결됨' + projectSuffix + '</span>' +
            '</span>';
    } else if (st.mode === "cloud" && !st.connected && st.error) {
        const hint = getFirebaseErrorDiagnosticHint(st.error);
        badgeHtml =
            '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-extrabold">' +
                '<span>🟡</span>' +
                '<span>Firebase 연결 오류: ' + escapeHtml(st.error) + '</span>' +
            '</span>';
        if (hint) {
            hintHtml = '<p class="text-[11px] font-semibold text-amber-700 mt-1.5">💡 ' + escapeHtml(hint) + (st.projectId ? ' <span class="font-mono text-amber-600">(' + escapeHtml(st.projectId) + ')</span>' : '') + '</p>';
        }
    } else if (st.mode === "cloud" && !st.connected) {
        badgeHtml =
            '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold">' +
                '<span>🟡</span>' +
                '<span>Firebase 연결 중...' + projectSuffix + '</span>' +
            '</span>';
    } else {
        badgeHtml =
            '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">' +
                '<span>⚪</span>' +
                '<span>로컬 저장 모드 (js/firebase-config.js 미설정)</span>' +
            '</span>';
    }

    return '<div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
        '<div class="min-w-0">' +
            '<div class="flex items-center gap-2 flex-wrap">' +
                '<span class="text-xs font-black text-slate-700">실시간 동기화 상태:</span>' +
                badgeHtml +
            '</div>' +
            hintHtml +
        '</div>' +
        '<button type="button" onclick="manualPushConfigToCloud()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer shrink-0">' +
            '<span>☁️</span>' +
            '<span>현재 데이터 서버에 즉시 반영</span>' +
        '</button>' +
    '</div>';
}

function renderCloudSyncModalStatusHtml() {
    const st = getFirebaseSyncStatusSafe();
    const projectSuffix = st.projectId ? " (" + escapeHtml(st.projectId) + ")" : "";

    if (st.mode === "cloud" && st.connected) {
        return '<div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">' +
            '<div class="font-extrabold">🟢 Firebase 실시간 동기화 연결됨' + projectSuffix + '</div>' +
            (st.lastSyncAt ? '<div class="text-[11px] text-emerald-700">최근 동기화: ' + escapeHtml(new Date(st.lastSyncAt).toLocaleTimeString("ko-KR")) + '</div>' : '') +
        '</div>';
    }
    if (st.mode === "cloud" && !st.connected && st.error) {
        const hint = getFirebaseErrorDiagnosticHint(st.error);
        return '<div class="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1.5">' +
            '<div class="font-extrabold">🟡 Firebase 연결 오류: ' + escapeHtml(st.error) + '</div>' +
            (hint ? '<div class="text-[11px] font-bold text-amber-800">💡 ' + escapeHtml(hint) + '</div>' : '') +
            (st.projectId ? '<div class="text-[11px] font-mono text-amber-700">프로젝트 ID: ' + escapeHtml(st.projectId) + '</div>' : '') +
        '</div>';
    }
    if (st.mode === "cloud" && !st.connected) {
        return '<div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">' +
            '<div class="font-extrabold">🟡 Firebase 연결 중...' + projectSuffix + '</div>' +
            '<div class="text-[11px] text-amber-700">Firestore 서버와 실시간 연결을 설정하고 있습니다.</div>' +
        '</div>';
    }
    return '<div class="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">⚪ 로컬 저장 모드 (js/firebase-config.js 미설정)</div>';
}

function renderSyncStatusUI() {
    const st = getFirebaseSyncStatusSafe();

    // 1. Always-visible live sync pill in #mainHeader
    const headerBtn = document.getElementById("headerSyncBadge");
    const headerDot = document.getElementById("headerSyncBadgeDot");
    const headerText = document.getElementById("headerSyncBadgeText");
    if (headerBtn && headerDot && headerText) {
        const baseCls = "px-2.5 py-1 rounded-full border text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs";
        if (st.mode === "cloud" && st.connected) {
            headerBtn.className = baseCls + " bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-200";
            headerBtn.title = "Firebase 실시간 동기화 연결됨" + (st.projectId ? " (" + st.projectId + ")" : "");
            headerDot.textContent = "🟢";
            headerText.innerHTML = '실시간<span class="hidden sm:inline"> 동기화</span>';
        } else if (st.mode === "cloud" && !st.connected && st.error) {
            headerBtn.className = baseCls + " bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-amber-200";
            headerBtn.title = "Firebase 연결 오류: " + st.error;
            headerDot.textContent = "🟡";
            headerText.textContent = "DB 확인필요";
        } else if (st.mode === "cloud" && !st.connected) {
            headerBtn.className = baseCls + " bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-200";
            headerBtn.title = "Firebase 실시간 동기화 연결 중..." + (st.projectId ? " (" + st.projectId + ")" : "");
            headerDot.textContent = "🟡";
            headerText.textContent = "연결 중...";
        } else {
            headerBtn.className = baseCls + " bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white";
            headerBtn.title = "로컬 저장 모드 (js/firebase-config.js 미설정)";
            headerDot.textContent = "⚪";
            headerText.textContent = "로컬";
        }
    }

    // 2. Admin view sync status bar
    const syncBarEl = document.getElementById("adminFirebaseSyncBar");
    if (syncBarEl) {
        syncBarEl.innerHTML = renderFirebaseSyncStatusHtml();
    }

    // 3. Cloud sync modal status panel
    const syncModalEl = document.getElementById("cloudSyncModalStatus");
    if (syncModalEl) {
        syncModalEl.innerHTML = renderCloudSyncModalStatusHtml();
    }
}

function renderAdminView() {
    renderSyncStatusUI();

    const totalInp = document.getElementById("adminInputTotalAttendees");
    if (totalInp) totalInp.value = appState.totalAttendees;
    const curAttSpan = document.getElementById("adminCurrentAttendeesSpan");
    if (curAttSpan) curAttSpan.textContent = appState.totalAttendees;
    const officialCountSpan = document.getElementById("adminOfficialMemberCountSpan");
    if (officialCountSpan) officialCountSpan.textContent = (typeof FULL_MEMBER_ROSTER !== "undefined" ? FULL_MEMBER_ROSTER.length : 134);

    const winnerToggle = document.getElementById("adminWinnerPublicToggle");
    if (winnerToggle) winnerToggle.checked = Boolean(appState.winnerPagePublic);

    const modeSel = document.getElementById("adminElectionModeSelect");
    if (modeSel) modeSel.value = appState.election.mode;

    // 1. 식순 관리 리스트 (#adminScheduleListContainer)
    const schCont = document.getElementById("adminScheduleListContainer");
    if (schCont) {
        let schHtml = "";
        (appState.assemblySchedule || []).forEach(function(item) {
            const isDone = item.status === "완료";
            const isIng = item.status === "진행중";
            const statusBadge = isDone
                ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">완료</span>'
                : (isIng
                    ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse shrink-0">진행중</span>'
                    : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 shrink-0">' + escapeHtml(item.status) + '</span>');

            const safeAdminTargetTab = (typeof normalizeScheduleTargetTab === "function")
                ? normalizeScheduleTargetTab(item.targetTab)
                : (item.targetTab === "sectionConcertReview" ? "concert" : (item.targetTab || ""));
            const tabBadge = safeAdminTargetTab
                ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 shrink-0">연결: ' + escapeHtml(safeAdminTargetTab) + ' (' + escapeHtml(item.btnLabel || "이동") + ')</span>'
                : '<span class="text-[11px] text-slate-400 shrink-0">(연결 없음)</span>';

            schHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">' +
                '<div class="flex items-start gap-3 min-w-0">' +
                    statusBadge +
                    '<div class="min-w-0">' +
                        '<div class="text-xs font-black text-slate-900 truncate">' + escapeHtml(item.title) + '</div>' +
                        '<div class="text-[11px] text-slate-500 mt-0.5 break-keep">' + escapeHtml(item.desc) + '</div>' +
                        '<div class="mt-1">' + tabBadge + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">' +
                    '<button type="button" onclick="openScheduleModal(\'' + item.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteScheduleItem(\'' + item.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 삭제</button>' +
                '</div>' +
            '</div>';
        });
        schCont.innerHTML = schHtml || '<div class="text-center py-6 text-slate-400 text-xs">등록된 식순이 없습니다. 상단 [+ 식순 추가] 버튼을 눌러 추가하세요.</div>';
    }

    // 2. 연간 행사 타임라인 리스트 (#adminEventsTimelineList or #adminEventsListContainer)
    const evCont = document.getElementById("adminEventsTimelineList") || document.getElementById("adminEventsListContainer");
    if (evCont) {
        let evHtml = "";
        (appState.events || []).forEach(function(ev) {
            evHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition flex flex-col justify-between gap-2 shadow-xs">' +
                '<div>' +
                    '<div class="flex items-center justify-between gap-1">' +
                        '<span class="font-black text-xs text-indigo-950">' + escapeHtml(ev.title) + '</span>' +
                        '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">' + escapeHtml(ev.date) + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-slate-600 mt-1">' + escapeHtml(ev.desc) + '</p>' +
                    (ev.place ? '<p class="text-[11px] text-slate-400 mt-0.5">장소: ' + escapeHtml(ev.place) + '</p>' : '') +
                '</div>' +
                '<div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">' +
                    '<button type="button" onclick="openEditEventModal(\'' + ev.id + '\')" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 수정</button>' +
                    '<button type="button" onclick="deleteEventItem(\'' + ev.id + '\')" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️ 삭제</button>' +
                '</div>' +
            '</div>';
        });
        evCont.innerHTML = evHtml || '<div class="col-span-2 text-center py-6 text-slate-400 text-xs">등록된 연간 행사가 없습니다. 상단 [+ 행사 내역 추가] 버튼을 눌러 추가하세요.</div>';
    }

    // 3. 단칙 조문 관리 리스트 (#adminBylawsListContainer)
    const byCont = document.getElementById("adminBylawsListContainer");
    if (byCont) {
        const adminQ = (document.getElementById("adminBylawsSearchInput") ? document.getElementById("adminBylawsSearchInput").value : "").trim().toLowerCase();
        const filtered = (appState.bylaws || []).filter(function(cl) {
            if (!adminQ) return true;
            return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], adminQ);
        });

        let byHtml = "";
        filtered.forEach(function(cl) {
            byHtml += '<div class="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">' +
                '<div class="min-w-0 flex-1">' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 shrink-0">' + escapeHtml(cl.chapter) + '</span>' +
                        '<span class="text-xs font-black text-slate-900">' + escapeHtml(cl.articleNo + " (" + cl.title + ")") + '</span>' +
                    '</div>' +
                    '<p class="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">' + escapeHtml(cl.content) + '</p>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">' +
                    '<button type="button" onclick="openEditClauseModal(\'' + cl.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition cursor-pointer">✎ 조문 수정</button>' +
                    '<button type="button" onclick="deleteClauseItem(\'' + cl.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">🗑️</button>' +
                '</div>' +
            '</div>';
        });
        byCont.innerHTML = byHtml || '<div class="text-center py-6 text-slate-400 text-xs">일치하는 단칙 조항이 없습니다.</div>';
    }

    // 4. 18인 운영진 명부 관리 (#adminExecutiveRosterTableBody)
    const execTbody = document.getElementById("adminExecutiveRosterTableBody");
    if (execTbody) {
        let execHtml = "";
        EXECUTIVE_ROSTER.forEach(function(exec, i) {
            execHtml += '<tr class="border-b border-slate-100 hover:bg-slate-50/80 transition text-xs whitespace-nowrap">' +
                '<td class="py-2.5 px-3 text-center text-slate-500 font-semibold">' + (i + 1) + '</td>' +
                '<td class="py-2.5 px-3 font-bold text-slate-800">' +
                    '<span class="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold mr-1.5 border border-rose-200">' + escapeHtml(exec.role) + getExecutiveRoleIconHtml(exec.role) + '</span>' +
                    (exec.subRole && exec.subRole !== '-' ? '<span class="text-slate-500 font-normal">(' + escapeHtml(exec.subRole) + ')</span>' : '') +
                '</td>' +
                '<td class="py-2.5 px-3 font-extrabold text-slate-900">' + escapeHtml(exec.name) + '</td>' +
                '<td class="py-2.5 px-3 text-slate-600">' + escapeHtml(String(exec.gen || '').replace(/기+$/g, '')) + '</td>' +
                '<td class="py-2.5 px-3">' +
                    '<span class="font-semibold text-slate-700">' + escapeHtml(exec.part) + '</span>' +
                    (exec.detailPart ? '<span class="text-slate-400 text-[11px] ml-1">(' + escapeHtml(exec.detailPart) + ')</span>' : '') +
                '</td>' +
                '<td class="py-2.5 px-3 text-slate-600">' + escapeHtml(exec.company) + '</td>' +
                '<td class="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">' +
                    '<span class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">' + escapeHtml(exec.code || '-') + '</span>' +
                '</td>' +
            '</tr>';
        });
        execTbody.innerHTML = execHtml;
    }
}

function renderAuthModalMemberList() {
    // v20: 134-member list modal replaced by clean [이름 + 휴대폰 뒷자리 4자리] login modal
}


// ============================================================
// 2026 정기총회 참석·위임 사전 조사 뷰 렌더러
// ============================================================

function renderAttendanceView() {
    const viewEl = document.getElementById("view-attendance");
    if (!viewEl) return;

    const roster = (typeof FULL_MEMBER_ROSTER !== "undefined" && Array.isArray(FULL_MEMBER_ROSTER))
        ? FULL_MEMBER_ROSTER
        : (appState.members || []);
    const totalMembers = roster.length || 131;
    const quorumGoal = Math.ceil((totalMembers * 2) / 3);

    if (!appState.attendanceSurvey) {
        appState.attendanceSurvey = {
            deadline: "2026년 12월 12일 23:59",
            targetTotal: totalMembers,
            quorumThreshold: quorumGoal,
            votes: {}
        };
    }
    const votes = appState.attendanceSurvey.votes || {};

    let onsiteCount = 0;
    let shadowCount = 0;
    let absentCount = 0;
    let pendingCount = 0;

    roster.forEach(function(m) {
        const v = votes[m.id];
        if (v === "onsite") onsiteCount++;
        else if (v === "shadow") shadowCount++;
        else if (v === "absent") absentCount++;
        else pendingCount++;
    });

    const quorumCount = onsiteCount + shadowCount;
    const quorumPercent = Math.min(100, Math.round((quorumCount / quorumGoal) * 100));
    const quorumMet = quorumCount >= quorumGoal;

    // 1. Update Header Status Badge
    const headerBadge = document.getElementById("attHeaderBadgeStatus");
    if (headerBadge) {
        if (quorumMet) {
            headerBadge.className = "px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5";
            headerBadge.innerHTML = '<span>🎉</span> 개회 정족수 충족 (' + quorumCount + '/' + quorumGoal + '명)';
        } else {
            const needed = quorumGoal - quorumCount;
            headerBadge.className = "px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5";
            headerBadge.innerHTML = '<span>⚠️</span> 성원까지 ' + needed + '명 필요 (' + quorumCount + '/' + quorumGoal + '명)';
        }
    }

    // 2. Update Quorum Goal Displays
    const countDisplay = document.getElementById("attQuorumCountDisplay");
    if (countDisplay) countDisplay.textContent = quorumCount;

    const rateDisplay = document.getElementById("attQuorumRateDisplay");
    if (rateDisplay) {
        rateDisplay.textContent = quorumPercent + "%";
        if (quorumMet) {
            rateDisplay.className = "text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ml-1";
        } else {
            rateDisplay.className = "text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 ml-1";
        }
    }

    const progBar = document.getElementById("attQuorumProgressBar");
    if (progBar) {
        progBar.style.width = Math.min(100, (quorumCount / quorumGoal) * 100) + "%";
        if (quorumMet) {
            progBar.className = "h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500";
        } else {
            progBar.className = "h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500";
        }
    }

    const progStatusText = document.getElementById("attQuorumProgressStatusText");
    if (progStatusText) {
        if (quorumMet) {
            progStatusText.className = "font-bold text-emerald-600";
            progStatusText.textContent = "개회 정족수 충족 완료 (" + quorumCount + "명 / " + quorumGoal + "명)";
        } else {
            progStatusText.className = "font-bold text-indigo-600";
            progStatusText.textContent = "현재 " + quorumCount + "명 (달성률 " + quorumPercent + "%)";
        }
    }

    // 3. Update 4 Stats Grid
    const statOnsite = document.getElementById("attStatCountOnsite");
    if (statOnsite) statOnsite.textContent = onsiteCount;
    const rateOnsite = document.getElementById("attStatRateOnsite");
    if (rateOnsite) rateOnsite.textContent = "(" + Math.round((onsiteCount / totalMembers) * 100) + "%)";

    const statShadow = document.getElementById("attStatCountShadow");
    if (statShadow) statShadow.textContent = shadowCount;
    const rateShadow = document.getElementById("attStatRateShadow");
    if (rateShadow) rateShadow.textContent = "(" + Math.round((shadowCount / totalMembers) * 100) + "%)";

    const statAbsent = document.getElementById("attStatCountAbsent");
    if (statAbsent) statAbsent.textContent = absentCount;
    const rateAbsent = document.getElementById("attStatRateAbsent");
    if (rateAbsent) rateAbsent.textContent = "(" + Math.round((absentCount / totalMembers) * 100) + "%)";

    const statPending = document.getElementById("attStatCountPending");
    if (statPending) statPending.textContent = pendingCount;
    const ratePending = document.getElementById("attStatRatePending");
    if (ratePending) ratePending.textContent = "(" + Math.round((pendingCount / totalMembers) * 100) + "%)";

    // 4. Update Quorum Callout Banner
    const callout = document.getElementById("attQuorumCalloutBanner");
    if (callout) {
        if (quorumMet) {
            callout.className = "p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center gap-3";
            callout.innerHTML = '<span class="text-2xl">🎉</span><div><h4 class="font-extrabold text-sm sm:text-base text-emerald-950">정기총회 개회 정족수(91명) 충족 완료!</h4><p class="text-xs sm:text-sm text-emerald-800 mt-0.5">현장 참석(' + onsiteCount + '명) 및 쉐도우보팅 위임(' + shadowCount + '명)으로 총 ' + quorumCount + '명이 성원되어 단칙 제20조 제2항에 따른 총회 개회 및 의결 요건을 완벽히 달성하였습니다.</p></div>';
        } else {
            const diff = quorumGoal - quorumCount;
            callout.className = "p-4 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950 flex items-center gap-3";
            callout.innerHTML = '<span class="text-2xl">📢</span><div><h4 class="font-extrabold text-sm sm:text-base text-amber-950">개회 정족수 달성까지 앞으로 ' + diff + '명의 출석이 더 필요합니다</h4><p class="text-xs sm:text-sm text-amber-800 mt-0.5">총회 당일 직접 참석이 어려우신 단원님께서는 <strong>쉐도우 보팅(의결권 위임)</strong>에 참여해 주시면 성원 인원으로 즉시 인정됩니다.</p></div>';
        }
    }

    // 5. Update Navbar Tab Badge
    const navBadge = document.getElementById("navBadgeAttendanceCount");
    if (navBadge) {
        navBadge.textContent = quorumCount + "/" + (survey.quorumThreshold || 88);
        if (quorumMet) {
            navBadge.className = "px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold";
        } else {
            navBadge.className = "px-1.5 py-0.2 rounded text-[10px] bg-slate-700/50 text-slate-300 border border-slate-600/40 font-semibold";
        }
    }

    // 6. Render Member Voting Action Card
    renderAttendanceVotingBox();

    // 7. Render Executive Tools
    renderAttendanceExecutiveTools(roster, votes, onsiteCount, shadowCount, absentCount, pendingCount);

    // 8. Render Roster List & Filter
    renderAttendanceRosterList(roster, votes);
}

function renderAttendanceVotingBox() {
    const container = document.getElementById("attVotingActionContainer");
    if (!container) return;

    const voter = (typeof getCurrentVoter === "function") ? getCurrentVoter() : null;
    const votes = (appState.attendanceSurvey && appState.attendanceSurvey.votes) || {};
    const myChoice = voter ? votes[voter.id] : null;

    if (!voter) {
        container.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div class="flex items-center gap-3 text-left">
                    <span class="text-2xl">👤</span>
                    <div>
                        <h4 class="text-sm font-extrabold text-slate-900">단원 본인 로그인 후 참석 여부를 선택해 주세요</h4>
                        <p class="text-xs text-slate-500 mt-0.5">삼성한우리합창단 정단원 본인 확인을 거쳐 현장 참석 또는 의결권 위임을 제출하실 수 있습니다.</p>
                    </div>
                </div>
                <button type="button" onclick="openMemberLoginModal()" class="shrink-0 w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-sm transition cursor-pointer">
                    단원 로그인하기 →
                </button>
            </div>
        `;
        return;
    }

    const choiceBadge = myChoice === "onsite"
        ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">🏢 현장 참석 (제출완료)</span>'
        : myChoice === "shadow"
        ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">🤝 쉐도우보팅 위임 (제출완료)</span>'
        : myChoice === "absent"
        ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">❌ 전체 불참 (제출완료)</span>'
        : '<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">⏳ 미응답 (선택 필요)</span>';

    const cardOnsiteClass = myChoice === "onsite"
        ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
        : "border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 bg-white";

    const cardShadowClass = myChoice === "shadow"
        ? "border-2 border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
        : "border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 bg-white";

    const cardAbsentClass = myChoice === "absent"
        ? "border-2 border-rose-600 bg-rose-50/70 shadow-sm ring-2 ring-rose-500/20"
        : "border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 bg-white";

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-sm font-black text-slate-900">${voter.name} 단원님 (${voter.gen}기 ${voter.part})</span>
                    ${voter.isExecutive ? '<span class="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">운영진</span>' : ''}
                </div>
                <p class="text-xs text-slate-500 mt-0.5">총회 당일 참석 가능 여부를 아래 3가지 중 1개 선택해 주십시오.</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500 font-semibold">현재 상태:</span>
                ${choiceBadge}
                ${myChoice ? '<button type="button" onclick="cancelAttendanceSurveyVote()" class="px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer" title="응답 초기화">초기화</button>' : ''}
            </div>
        </div>

        <!-- 3 Interactive Choice Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            <!-- Choice 1: On-site -->
            <div onclick="voteAttendanceSurvey('onsite')" class="p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${cardOnsiteClass}">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xl">🏢</span>
                        ${myChoice === "onsite" ? '<span class="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">✓ 나의 선택</span>' : '<span class="text-xs font-semibold text-slate-400">선택하기</span>'}
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-900">1. 현장 직접 참석</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        2026년 12월 13일 정기총회 현장에 직접 참석하여 활동 보고 청취 및 단칙 개정·단장 선거 투표에 참여합니다.
                    </p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">성원 인정 (단칙 제20조 ②)</span>
                    <span class="text-xs font-extrabold ${myChoice === "onsite" ? 'text-indigo-700' : 'text-slate-400'}">선택</span>
                </div>
            </div>

            <!-- Choice 2: Shadow Voting -->
            <div onclick="voteAttendanceSurvey('shadow')" class="p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${cardShadowClass}">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xl">🤝</span>
                        ${myChoice === "shadow" ? '<span class="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">✓ 나의 선택</span>' : '<span class="text-xs font-semibold text-slate-400">선택하기</span>'}
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-900">2. 현장 불참 / 쉐도우보팅 참여</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        현장엔 불참하나 총회 성원을 위해 의결권을 위임하며, 출석 단원들의 투표 결과에 따라 비례 표결하는 '쉐도우 보팅'에 동의합니다.
                    </p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">성원 인정 (단칙 제20조 ⑤)</span>
                    <span class="text-xs font-extrabold ${myChoice === "shadow" ? 'text-emerald-700' : 'text-slate-400'}">선택</span>
                </div>
            </div>

            <!-- Choice 3: Absent -->
            <div onclick="voteAttendanceSurvey('absent')" class="p-4 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${cardAbsentClass}">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xl">❌</span>
                        ${myChoice === "absent" ? '<span class="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">✓ 나의 선택</span>' : '<span class="text-xs font-semibold text-slate-400">선택하기</span>'}
                    </div>
                    <h4 class="text-sm font-extrabold text-slate-900">3. 전체 불참</h4>
                    <p class="text-xs text-slate-600 leading-relaxed">
                        부득이한 사정으로 현장 참석 및 의결권 위임(쉐도우보팅)에 모두 참여하지 않습니다. (총회 개회 정족수에서 제외됩니다)
                    </p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">정족수 미산입</span>
                    <span class="text-xs font-extrabold ${myChoice === "absent" ? 'text-rose-700' : 'text-slate-400'}">선택</span>
                </div>
            </div>
        </div>
    `;
}

function renderAttendanceExecutiveTools(roster, votes, onsite, shadow, absent, pending) {
    const container = document.getElementById("attExecutiveToolsContainer");
    if (!container) return;

    const isExec = (typeof isCurrentUserExecutive === "function")
        ? isCurrentUserExecutive()
        : Boolean(appState.isAdminAuthenticated);

    if (!isExec) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">운영진 전용</span>
                    <h3 class="text-base font-extrabold text-white">총회 성원 관리 및 단원 독려 도구</h3>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">단원들에게 카카오톡 공지 시 원클릭으로 명단을 복사하여 발송할 수 있습니다.</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">미응답 단원: <strong class="text-amber-400">${pending}명</strong></span>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" onclick="copyUnansweredAttendanceMembers()" class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>📋</span> 미응답 단원 명단 카톡 복사 (${pending}명)
            </button>
            <button type="button" onclick="copyOnsiteAttendanceMembers()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>🏢</span> 현장 참석자 명단 카톡 복사 (${onsite}명)
            </button>
            <button type="button" onclick="copyAttendanceSummaryReport()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer">
                <span>📊</span> 성원 집계 요약 복사
            </button>
        </div>
    `;
}

function renderAttendanceRosterList(roster, votes) {
    const filterContainer = document.getElementById("attRosterFilterButtons");
    const listContainer = document.getElementById("attRosterListContainer");
    if (!filterContainer || !listContainer) return;

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

    const activeF = (typeof currentAttendanceFilter !== "undefined") ? currentAttendanceFilter : ((typeof window.currentAttendanceFilter !== "undefined") ? window.currentAttendanceFilter : "all");

    // 1. Render Filter Buttons
    const filters = [
        { key: "all", label: "전체 (" + roster.length + ")" },
        { key: "onsite", label: "🏢 현장 (" + onsite + ")" },
        { key: "shadow", label: "🤝 쉐도우 (" + shadow + ")" },
        { key: "absent", label: "❌ 불참 (" + absent + ")" },
        { key: "pending", label: "⏳ 미응답 (" + pending + ")" }
    ];

    filterContainer.innerHTML = filters.map(function(f) {
        const isActive = activeF === f.key;
        const cls = isActive
            ? "px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-xs cursor-pointer"
            : "px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer";
        return '<button type="button" onclick="setAttendanceFilter(\'' + f.key + '\')" class="' + cls + '">' + f.label + '</button>';
    }).join("");

    // 2. Filter Members
    const filtered = roster.filter(function(m) {
        const v = votes[m.id];
        if (activeF === "onsite" && v !== "onsite") return false;
        if (activeF === "shadow" && v !== "shadow") return false;
        if (activeF === "absent" && v !== "absent") return false;
        if (activeF === "pending" && Boolean(v)) return false;

        const searchQ = (typeof currentAttendanceSearch !== "undefined") ? currentAttendanceSearch : ((typeof window.currentAttendanceSearch !== "undefined") ? window.currentAttendanceSearch : "");
        if (searchQ) {
            const haystack = (m.name + " " + m.part + " " + m.gen + " " + (m.company || "")).toLowerCase();
            if (haystack.indexOf(searchQ) === -1) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="py-8 text-center text-xs text-slate-400">조건에 일치하는 단원이 없습니다.</div>';
        return;
    }

    // 3. Render Table
    let tableHtml = `
        <table class="w-full text-left border-collapse text-xs">
            <thead>
                <tr class="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold">
                    <th class="py-2.5 px-3">단원 성명</th>
                    <th class="py-2.5 px-3">기수 / 파트</th>
                    <th class="py-2.5 px-3">소속사</th>
                    <th class="py-2.5 px-3 text-right">참석 조사 응답</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
    `;

    filtered.forEach(function(m) {
        const v = votes[m.id];
        let statusBadge = '';
        if (v === "onsite") {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px] border border-indigo-200">🏢 현장 참석</span>';
        } else if (v === "shadow") {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">🤝 쉐도우보팅(위임)</span>';
        } else if (v === "absent") {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">❌ 전체 불참</span>';
        } else {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium text-[11px] border border-slate-200">⏳ 미응답</span>';
        }

        tableHtml += `
            <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="py-2.5 px-3 font-bold text-slate-900">
                    ${m.name}
                    ${m.isExecutive ? '<span class="ml-1 px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-bold">운영진</span>' : ''}
                </td>
                <td class="py-2.5 px-3 text-slate-600 font-medium">${m.gen}기 · <span class="font-bold text-slate-700">${m.part}</span></td>
                <td class="py-2.5 px-3 text-slate-500">${m.company || '-'}</td>
                <td class="py-2.5 px-3 text-right">${statusBadge}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;

    listContainer.innerHTML = tableHtml;
}
