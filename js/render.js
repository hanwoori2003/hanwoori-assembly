// 3-2. 화면 렌더링 함수 모음
    function renderAll() {
      renderHeaderStatus();
      renderExecutiveRosterTable();
      renderFullMemberRosterTable();
      renderEventsView();
      renderCurrentBylawsView();
      renderFullSearchView();
      renderDrawerSearchResults();
      renderAgendaStepper();
      renderActiveVotingView();
      renderElectionView();
      renderWinnerView();
      renderSettlementView();
      renderAdminView();
      renderAuthModalMemberList();
    }

    function renderHeaderStatus() {
      const majority = getMajorityThreshold(appState.totalAttendees);
      document.getElementById("headerTotalAttendees").textContent = appState.totalAttendees + "명";
      document.getElementById("headerMajorityThreshold").textContent = majority + "표↑";
      const subNote = document.getElementById("headerAttendanceSubNote");
      if (subNote) {
        if (appState.totalAttendees === 127) {
          subNote.textContent = "(현장 39 + 쉐도우보팅 94 / 재적 164명)";
        } else if (appState.totalAttendees === 134) {
          subNote.textContent = "(2026 전체 인원 명부 134명 전원)";
        } else if (appState.totalAttendees >= 36 && appState.totalAttendees <= 39) {
          subNote.textContent = "(현장 카페 실투표 참여 인원 기준)";
        } else {
          subNote.textContent = "(운영진 설정 참석 인원)";
        }
      }

      const voter = getCurrentVoter();
      const rolePrefix = (voter.isExecutive && appState.isAdminAuthenticated) ? "★운영진 · " : "";
      document.getElementById("currentVoterBadgeText").textContent =
        rolePrefix + voter.name + " (" + voter.part + ")";

      const isExecLoggedIn = Boolean(voter.isExecutive && appState.isAdminAuthenticated);
      const adminTabBtn = document.getElementById("tabBtn-admin");
      const winnerTabBtn = document.getElementById("tabBtn-winner");
      const heroWinnerBtn = document.getElementById("heroBtnWinnerPage");

      if (adminTabBtn) {
        if (isExecLoggedIn) adminTabBtn.classList.remove("hidden");
        else adminTabBtn.classList.add("hidden");
      }
      if (winnerTabBtn) {
        if (isExecLoggedIn || appState.winnerPagePublic) winnerTabBtn.classList.remove("hidden");
        else winnerTabBtn.classList.add("hidden");
      }
      if (heroWinnerBtn) {
        if (isExecLoggedIn || appState.winnerPagePublic) heroWinnerBtn.classList.remove("hidden");
        else heroWinnerBtn.classList.add("hidden");
      }
      if (!isExecLoggedIn && (appState.activeTab === "admin" || (appState.activeTab === "winner" && !appState.winnerPagePublic))) {
        appState.activeTab = "events";
        ["admin", "winner"].forEach(function(hidTab) {
          const sec = document.getElementById("view-" + hidTab);
          if (sec) sec.classList.add("hidden");
        });
        const evSec = document.getElementById("view-events");
        if (evSec) evSec.classList.remove("hidden");
      }

      const activeAgenda = getActiveAgenda();
      document.getElementById("navBadgeAgendaProgress").textContent =
        activeAgenda.orderNo + "/" + appState.agendas.length;

      const clauseBadge = document.getElementById("navBadgeClauseTotal");
      if (clauseBadge && appState.bylaws.length > 0) {
        clauseBadge.textContent = "제1조~" + appState.bylaws[appState.bylaws.length - 1].articleNo;
      }
      const fileStatus = document.getElementById("uploadedFileStatusBadge");
      if (fileStatus) {
        fileStatus.textContent = (appState.uploadedFileName || "단칙") + " · 총 " + appState.bylaws.length + "개 조항 수록";
      }
      const viewerBadge = document.getElementById("bylawViewerFileBadge");
      if (viewerBadge) {
        viewerBadge.textContent = (appState.uploadedFileName || "단칙") + " · 총 " + appState.bylaws.length + "개 조항";
      }
    }

    function renderExecutiveRosterTable() {
      const tbody = document.getElementById("executiveRosterTableBody");
      if (!tbody) return;
      let html = "";
      EXECUTIVE_ROSTER.forEach(function(r) {
        let rowBg = "bg-white";
        let companyBadge = "";
        if (r.groupType === "samsung_elec") {
          rowBg = "bg-blue-50/50";
          companyBadge = '<span class="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs">' + escapeHtml(r.company) + '</span>';
        } else if (r.groupType === "non_samsung") {
          rowBg = "bg-slate-100/90";
          companyBadge = '<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-xs">비삼성</span>';
        } else {
          companyBadge = '<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold text-xs">' + escapeHtml(r.company) + '</span>';
        }

        html += '<tr class="' + rowBg + ' hover:bg-indigo-50/50 transition">' +
          '<td class="py-2.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">' + escapeHtml(r.role) + '</td>' +
          '<td class="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">' + escapeHtml(r.subRole) + '</td>' +
          '<td class="py-2.5 px-3 font-extrabold text-indigo-950 whitespace-nowrap">' + escapeHtml(r.name) + '</td>' +
          '<td class="py-2.5 px-3 text-center font-mono font-bold text-slate-700">' + escapeHtml(r.gen) + '기</td>' +
          '<td class="py-2.5 px-3 text-center"><span class="px-2 py-0.5 rounded bg-white border border-slate-200 font-extrabold text-xs text-slate-800">' + escapeHtml(r.detailPart) + '</span></td>' +
          '<td class="py-2.5 px-3 whitespace-nowrap">' + companyBadge + '</td>' +
          '<td class="py-2.5 px-3 font-mono text-xs text-slate-600">' + (r.email !== "-" ? escapeHtml(r.email) : '<span class="text-slate-400">-</span>') + '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    function formatAttCell(val) {
      if (!val || val === "-") return '<span class="text-slate-300">-</span>';
      if (val.indexOf("출석 1") !== -1) {
        return '<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">' + escapeHtml(val) + '</span>';
      }
      if (val.indexOf("지각") !== -1 || val.indexOf("조퇴") !== -1) {
        return '<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[11px]">' + escapeHtml(val) + '</span>';
      }
      return '<span class="text-slate-600 text-[11px]">' + escapeHtml(val) + '</span>';
    }

    function renderFullMemberRosterTable() {
      const tbody = document.getElementById("fullMemberRosterTableBody");
      if (!tbody) return;
      const partFilter = appState.rosterPartFilter || "all";
      const q = (appState.rosterSearchQuery || "").trim().toLowerCase();

      ["all", "소프라노", "알토", "테너", "베이스"].forEach(function(pf) {
        const btn = document.getElementById("btnRosterFilter-" + pf);
        if (!btn) return;
        if (pf === partFilter) {
          btn.className = "px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white";
        } else {
          btn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50";
        }
      });

      const sorted = appState.members.slice().sort(function(a, b) {
        return (a.rowNo || 999) - (b.rowNo || 999);
      });

      const filtered = sorted.filter(function(m) {
        if (partFilter !== "all" && m.basePart !== partFilter) return false;
        if (q) {
          const hay = (m.name + " " + m.part + " " + (m.basePart || "") + " " + (m.execRole || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      let html = "";
      filtered.forEach(function(m) {
        const isCurrent = m.id === appState.currentVoterId;
        const roleBadge = m.isExecutive
          ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">' + escapeHtml(m.execRole) + '</span>'
          : '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[11px]">정단원</span>';

        html += '<tr class="' + (isCurrent ? 'bg-indigo-50/70' : 'hover:bg-slate-50') + '">' +
          '<td class="py-2 px-3 font-mono text-slate-400">' + (m.rowNo || "-") + '</td>' +
          '<td class="py-2 px-3 font-extrabold text-slate-900 whitespace-nowrap">' + escapeHtml(m.name) + '</td>' +
          '<td class="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">' + escapeHtml(m.basePart) + '</td>' +
          '<td class="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">' + escapeHtml(m.key || (m.name + "-" + m.basePart)) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + roleBadge + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0307) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0314) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0321) + '</td>' +
          '<td class="py-2 px-3 whitespace-nowrap">' + formatAttCell(m.att0328) + '</td>' +
          '<td class="py-2 px-3 text-right whitespace-nowrap">' +
            (isCurrent
              ? '<span class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px]">현재 로그인</span>'
              : '<button type="button" onclick="selectVoter('' + m.id + '')" class="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px]">로그인 인증</button>') +
          '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    function renderCurrentBylawsView() {
      const container = document.getElementById("currentBylawsDocumentContainer");
      if (!container) return;
      const filterCh = appState.bylawViewerChapter || "all";
      const q = (appState.bylawSearchQuery || "").trim();

      ["all", "제1장", "제2장", "제3장", "제4장", "제5장", "제6장", "제9장"].forEach(function(chKey) {
        const btn = document.getElementById("btnChFilter-" + chKey);
        if (!btn) return;
        if (chKey === filterCh) {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white";
        } else {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-amber-50 text-slate-700";
        }
      });

      const clauses = appState.bylaws.filter(function(cl) {
        if (filterCh !== "all" && cl.chapter.indexOf(filterCh) === -1) return false;
        if (q) {
          return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
        }
        return true;
      });

      let html = "";
      if (clauses.length === 0) {
        html = '<div class="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">검색하신 키워드나 조항 번호와 일치하는 단칙 조문이 없습니다.</div>';
      } else {
        let currentCh = "";
        clauses.forEach(function(cl) {
          if (cl.chapter !== currentCh) {
            currentCh = cl.chapter;
            html += '<div class="pt-4 first:pt-0">' +
              '<h4 class="text-base sm:text-lg font-extrabold text-indigo-950 bg-indigo-50/80 border-l-4 border-indigo-600 px-4 py-2 rounded-r-xl">' + highlightMatch(currentCh, q) + '</h4>' +
            '</div>';
          }

          html += '<div class="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 transition hover:border-indigo-300 hover:bg-white">' +
            '<div class="flex flex-wrap items-center justify-between gap-2">' +
              '<div class="flex flex-wrap items-center gap-2">' +
                '<span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs sm:text-sm font-extrabold">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-1.5">' +
                '<button type="button" onclick="openEditClauseModal('' + cl.id + '')" class="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-500 text-xs font-bold text-slate-700">✎ 조문 수정</button>' +
              '</div>' +
            '</div>' +
            '<div class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line pl-1">' + highlightMatch(cl.content, q) + '</div>' +
          '</div>';
        });
      }

      container.innerHTML = html;
    }

    function renderAgendaStepper() {
      const container = document.getElementById("agendaStepperList");
      if (!container) return;
      let html = "";
      appState.agendas.forEach(function(ag) {
        const isCurrent = ag.id === appState.activeAgendaId;
        const tallies = getAgendaTallies(ag);
        let statusTag = "";
        if (ag.status === "adopted") {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 whitespace-nowrap">가결</span>';
        } else if (ag.status === "rejected") {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 whitespace-nowrap">부결</span>';
        } else if (ag.status === "active") {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 whitespace-nowrap">투표중</span>';
        } else {
          statusTag = '<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">대기</span>';
        }

        const cardBorder = isCurrent
          ? "border-2 border-indigo-600 bg-indigo-50/60 shadow-xs"
          : "border border-slate-200 bg-white hover:bg-slate-50";

        html += '<button type="button" onclick="selectAgenda('' + ag.id + '')" class="text-left p-2.5 rounded-xl transition flex flex-col justify-between ' + cardBorder + '">' +
          '<div class="flex items-center justify-between gap-1 w-full">' +
            '<span class="text-xs font-extrabold whitespace-nowrap ' + (isCurrent ? 'text-indigo-700' : 'text-slate-700') + '">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '</span>' +
            statusTag +
          '</div>' +
          '<div class="text-[11px] font-bold text-slate-600 truncate mt-0.5">' + escapeHtml(ag.targetArticle) + '</div>' +
          '<div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between w-full">' +
            '<span>찬성 ' + tallies.approve + '(' + tallies.majorityThreshold + ')</span>' +
            '<span class="whitespace-nowrap ' + (tallies.isAdopted ? 'text-emerald-600 font-bold' : 'text-rose-500 font-semibold') + '">' + (tallies.isAdopted ? '가결' : '부결') + '</span>' +
          '</div>' +
        '</button>';
      });
      container.innerHTML = html;
    }

    function renderActiveVotingView() {
      const ag = getActiveAgenda();
      const tallies = getAgendaTallies(ag);
      const voter = getCurrentVoter();
      const existingVote = (ag.memberVotes || {})[voter.id] || null;

      document.getElementById("activeAgendaOrderBadge").textContent = ag.codeName || ("제" + ag.orderNo + "호 안건");
      const typeBadge = document.getElementById("activeAgendaTypeBadge");
      typeBadge.textContent = ag.type === "신규안" ? "신규 신설안" : "단칙 개정안";
      typeBadge.className = ag.type === "신규안"
        ? "px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 font-extrabold text-xs whitespace-nowrap"
        : "px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs whitespace-nowrap";

      const propBadge = document.getElementById("activeAgendaProposerBadge");
      if (propBadge) {
        propBadge.textContent = "발의자: " + (ag.proposer || "운영진");
      }

      document.getElementById("activeAgendaTargetArticle").textContent = ag.targetArticle;
      document.getElementById("activeAgendaTitle").textContent = ag.title;
      document.getElementById("activeAgendaReason").textContent = ag.reason;

      const statusBadgeEl = document.getElementById("activeAgendaStatusBadge");
      if (ag.status === "adopted") {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-xs whitespace-nowrap">✓ 투표 결과: 가결 (2/3 이상 찬성)</span>';
      } else if (ag.status === "rejected") {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500 text-white shadow-xs whitespace-nowrap">✕ 투표 결과: 부결 (2/3 정족수 미달)</span>';
      } else if (ag.status === "active") {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 animate-pulse whitespace-nowrap">● 현재 상정 · 실시간 투표 진행중</span>';
      } else {
        statusBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200 whitespace-nowrap">상정 대기 (즉시 투표 가능)</span>';
      }

      document.getElementById("compareBeforeClauseLabel").textContent = ag.targetArticle;
      document.getElementById("compareAfterClauseLabel").textContent = ag.targetArticle;
      document.getElementById("compareAfterBadge").textContent = ag.type === "신규안" ? "변경 (신설 조문)" : "변경 (개정 조문)";
      document.getElementById("activeAgendaBeforeText").textContent = ag.beforeText;
      document.getElementById("activeAgendaAfterText").textContent = ag.afterText;

      let kwHtml = '<span class="text-xs font-bold text-slate-400 mr-1">관련 조항·키워드:</span>';
      (ag.keywords || []).forEach(function(kw) {
        kwHtml += '<button type="button" onclick="openDrawerWithQuery('' + escapeHtml(kw) + '')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition">#' + escapeHtml(kw) + '</button>';
      });
      document.getElementById("activeAgendaKeywordsList").innerHTML = kwHtml;

      renderRelatedIssuesForActiveAgenda(ag);

      document.getElementById("voterAvatarCircle").textContent = voter.name.charAt(0);
      document.getElementById("voterPanelName").textContent = voter.name + " 단원";
      document.getElementById("voterPanelPart").textContent = voter.part;
      document.getElementById("voterPanelCode").textContent = "KEY: " + (voter.key || voter.name) + " · 안건당 1인 1표 제한";

      const voterBadgeEl = document.getElementById("voterCurrentAgendaBadge");
      const lockTextEl = document.getElementById("voteLockNoticeText");
      const btnApprove = document.getElementById("btnVoteApprove");
      const btnReject = document.getElementById("btnVoteReject");
      const btnAbstain = document.getElementById("btnVoteAbstain");

      const choiceMapKor = { approve: "찬성", reject: "반대", abstain: "기권" };

      if (existingVote) {
        voterBadgeEl.innerHTML = '<span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold whitespace-nowrap">투표 완료 (' + choiceMapKor[existingVote] + ')</span>';
        lockTextEl.innerHTML = '<strong class="text-indigo-700">' + escapeHtml(voter.name) + '</strong> 님은 이 안건에 <strong>[' + choiceMapKor[existingVote] + ']</strong> 표를 행사하셨습니다.';
      } else {
        voterBadgeEl.innerHTML = '<span class="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold whitespace-nowrap">미투표 (투표 가능)</span>';
        lockTextEl.textContent = escapeHtml(voter.name) + " 단원 명의로 찬성·반대·기권 중 1표를 행사할 수 있습니다.";
      }

      [
        { btn: btnApprove, key: "approve" },
        { btn: btnReject, key: "reject" },
        { btn: btnAbstain, key: "abstain" }
      ].forEach(function(item) {
        if (item.key === "approve") {
          item.btn.className = "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition shadow-sm " +
            (existingVote === "approve"
              ? "border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-200"
              : existingVote
                ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-600 hover:border-emerald-600 text-emerald-900 hover:text-white");
        } else if (item.key === "reject") {
          item.btn.className = "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition shadow-sm " +
            (existingVote === "reject"
              ? "border-rose-600 bg-rose-600 text-white ring-4 ring-rose-200"
              : existingVote
                ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : "border-rose-200 bg-rose-50/50 hover:bg-rose-600 hover:border-rose-600 text-rose-900 hover:text-white");
        } else {
          item.btn.className = "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition shadow-sm " +
            (existingVote === "abstain"
              ? "border-slate-700 bg-slate-700 text-white ring-4 ring-slate-200"
              : existingVote
                ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : "border-slate-200 bg-slate-50 hover:bg-slate-700 hover:border-slate-700 text-slate-800 hover:text-white");
        }
      });

      document.getElementById("statTotalAttendees").textContent = tallies.totalAttendees + "명";
      document.getElementById("statMajorityRequired").textContent = tallies.majorityThreshold + "표↑";
      document.getElementById("statVotedCount").textContent = tallies.totalVoted + "명";
      document.getElementById("statRemainingCount").textContent = tallies.remaining + "명";

      const approvePct = tallies.totalAttendees > 0 ? ((tallies.approve / tallies.totalAttendees) * 100) : 0;
      const rejectPct = tallies.totalAttendees > 0 ? ((tallies.reject / tallies.totalAttendees) * 100) : 0;
      const abstainPct = tallies.totalAttendees > 0 ? ((tallies.abstain / tallies.totalAttendees) * 100) : 0;

      document.getElementById("majorityApprovalBar").style.width = Math.min(100, approvePct).toFixed(1) + "%";
      document.getElementById("majorityMarkerLabel").textContent = "▲ 2/3 가결선 (" + tallies.majorityThreshold + "표)";
      document.getElementById("majorityMaxLabel").textContent = tallies.totalAttendees + "표 (100%)";

      const verdictPill = document.getElementById("decisionVerdictPill");
      const subtextEl = document.getElementById("majorityProgressSubtext");

      if (tallies.isAdopted) {
        verdictPill.innerHTML = '<span class="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold flex items-center gap-1 whitespace-nowrap">✓ 결과: 가결 (' + tallies.approve + '/' + tallies.majorityThreshold + '표)</span>';
        subtextEl.textContent = "찬성 " + tallies.approve + "표 (" + approvePct.toFixed(1) + "%) — 2/3 가결 기준(" + tallies.majorityThreshold + "표) 충족!";
        subtextEl.className = "font-extrabold text-emerald-400";
      } else {
        const needed = tallies.majorityThreshold - tallies.approve;
        verdictPill.innerHTML = '<span class="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-extrabold whitespace-nowrap">✕ 결과: 부결 (가결선 ' + needed + '표 부족)</span>';
        subtextEl.textContent = "찬성 " + tallies.approve + "표 (" + approvePct.toFixed(1) + "%) · 2/3 가결 기준(" + tallies.majorityThreshold + "표)에 " + needed + "표 미달";
        subtextEl.className = "font-bold text-amber-300";
      }

      document.getElementById("barLabelApprove").textContent = tallies.approve + "표 (" + approvePct.toFixed(1) + "%)";
      document.getElementById("barFillApprove").style.width = Math.min(100, approvePct).toFixed(1) + "%";

      document.getElementById("barLabelReject").textContent = tallies.reject + "표 (" + rejectPct.toFixed(1) + "%)";
      document.getElementById("barFillReject").style.width = Math.min(100, rejectPct).toFixed(1) + "%";

      document.getElementById("barLabelAbstain").textContent = tallies.abstain + "표 (" + abstainPct.toFixed(1) + "%)";
      document.getElementById("barFillAbstain").style.width = Math.min(100, abstainPct).toFixed(1) + "%";
    }

    function renderRelatedIssuesForActiveAgenda(activeAgenda) {
      const container = document.getElementById("relatedIssuesAndAgendasContainer");
      const activeClauseSet = new Set(activeAgenda.relatedClauses || []);
      const activeKwSet = new Set(activeAgenda.keywords || []);

      const matchedIssues = appState.issues.filter(function(iss) {
        if ((iss.relatedAgendas || []).indexOf(activeAgenda.id) !== -1) return true;
        return (iss.relatedClauses || []).some(function(c) { return activeClauseSet.has(c); });
      });

      const matchedAgendas = appState.agendas.filter(function(other) {
        if (other.id === activeAgenda.id) return false;
        const shareClause = (other.relatedClauses || []).some(function(c) { return activeClauseSet.has(c); });
        const shareKw = (other.keywords || []).some(function(k) { return activeKwSet.has(k); });
        return shareClause || shareKw;
      });

      const matchedClauses = appState.bylaws.filter(function(cl) {
        return activeClauseSet.has(cl.articleNo);
      });

      let html = "";

      matchedIssues.forEach(function(iss) {
        html += '<div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
          '<div class="space-y-1">' +
            '<div class="flex flex-wrap items-center gap-1.5">' +
              '<span class="px-2 py-0.5 rounded bg-amber-500 text-white text-[11px] font-extrabold">' + escapeHtml(iss.code) + '</span>' +
              '<span class="text-xs font-bold text-amber-900">연관 조항: ' + escapeHtml((iss.relatedClauses || []).join(", ")) + '</span>' +
            '</div>' +
            '<div class="text-sm font-extrabold text-slate-900">' + escapeHtml(iss.title) + '</div>' +
            '<p class="text-xs text-slate-700 leading-relaxed">' + escapeHtml(iss.summary) + '</p>' +
          '</div>' +
          '<button type="button" onclick="openDrawerWithQuery('' + escapeHtml(iss.relatedClauses[0] || iss.title) + '')" class="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shrink-0 transition whitespace-nowrap">' +
            '관련 조항 즉석보기 →' +
          '</button>' +
        '</div>';
      });

      if (matchedAgendas.length > 0) {
        html += '<div class="pt-2"><div class="text-xs font-bold text-slate-500 mb-2">동일 조항·주제로 함께 상정된 개정안 (' + matchedAgendas.length + '건)</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">';
        matchedAgendas.forEach(function(other) {
          const t = getAgendaTallies(other);
          html += '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-indigo-300 transition flex flex-col justify-between gap-2">' +
            '<div>' +
              '<div class="flex items-center justify-between gap-1">' +
                '<span class="text-xs font-extrabold text-indigo-700">' + escapeHtml(other.codeName || ("제" + other.orderNo + "호")) + ' (' + escapeHtml(other.targetArticle) + ')</span>' +
                '<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 whitespace-nowrap">' + escapeHtml(other.proposer || other.type) + '</span>' +
              '</div>' +
              '<div class="text-xs font-bold text-slate-900 mt-1">' + escapeHtml(other.title) + '</div>' +
            '</div>' +
            '<div class="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">' +
              '<span class="text-slate-500">찬성 ' + t.approve + '표 / 기준 ' + t.majorityThreshold + '표</span>' +
              '<button type="button" onclick="selectAgenda('' + other.id + '')" class="font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">이 안건으로 이동 →</button>' +
            '</div>' +
          '</div>';
        });
        html += '</div></div>';
      }

      if (matchedClauses.length > 0) {
        html += '<div class="pt-2"><div class="text-xs font-bold text-slate-500 mb-2">참조된 현행 단칙 조문 (' + matchedClauses.length + '건)</div><div class="space-y-2">';
        matchedClauses.forEach(function(cl) {
          html += '<div class="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">' +
            '<div class="text-xs">' +
              '<span class="font-extrabold text-slate-900">' + escapeHtml(cl.articleNo) + ' (' + escapeHtml(cl.title) + ')</span> ' +
              '<span class="text-slate-600 line-clamp-2">' + escapeHtml(cl.content) + '</span>' +
            '</div>' +
            '<button type="button" onclick="openDrawerWithQuery('' + escapeHtml(cl.articleNo) + '')" class="text-xs font-bold text-indigo-600 hover:underline shrink-0 whitespace-nowrap">조문 전문 보기</button>' +
          '</div>';
        });
        html += '</div></div>';
      }

      container.innerHTML = html;
    }

    function renderFullSearchView() {
      const q = appState.fullSearchQuery;

      const filteredClauses = appState.bylaws.filter(function(cl) {
        return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
      });
      document.getElementById("searchCountClauses").textContent = filteredClauses.length + "개 조항";

      let clHtml = "";
      if (filteredClauses.length === 0) {
        clHtml = '<div class="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">검색어와 일치하는 단칙 조항이 없습니다.</div>';
      } else {
        filteredClauses.forEach(function(cl) {
          const amendedBadge = cl.lastAmended
            ? '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">' + escapeHtml(cl.lastAmended) + '</span>'
            : '';
          clHtml += '<div class="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 space-y-1.5">' +
            '<div class="flex flex-wrap items-center justify-between gap-1">' +
              '<div class="flex items-center gap-1.5">' +
                '<span class="text-xs font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + '</span>' +
                amendedBadge +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                '<span class="text-[11px] font-semibold text-slate-500">' + highlightMatch(cl.chapter, q) + '</span>' +
                '<button type="button" onclick="openEditClauseModal('' + cl.id + '')" class="px-2 py-0.5 rounded bg-white border border-slate-300 hover:border-indigo-500 text-[11px] font-bold text-indigo-700">✎ 조문 수정</button>' +
              '</div>' +
            '</div>' +
            '<p class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">' + highlightMatch(cl.content, q) + '</p>' +
            '<div class="flex flex-wrap gap-1 pt-1">' +
              (cl.keywords || []).map(function(k) {
                return '<button type="button" onclick="setFullSearchQuery('' + escapeHtml(k) + '')" class="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600">#' + highlightMatch(k, q) + '</button>';
              }).join("") +
            '</div>' +
          '</div>';
        });
      }
      document.getElementById("fullSearchClausesList").innerHTML = clHtml;

      const filteredAgendas = appState.agendas.filter(function(ag) {
        return matchesSearch([
          ag.codeName || ("제" + ag.orderNo + "호"),
          ag.proposer || "",
          ag.type,
          ag.targetArticle,
          ag.title,
          ag.beforeText,
          ag.afterText,
          ag.reason,
          (ag.relatedClauses || []).join(" "),
          (ag.keywords || []).join(" ")
        ], q);
      });
      document.getElementById("searchCountAgendas").textContent = filteredAgendas.length + "건";

      let agHtml = "";
      if (filteredAgendas.length === 0) {
        agHtml = '<div class="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">일치하는 개정안·신규안이 없습니다.</div>';
      } else {
        filteredAgendas.forEach(function(ag) {
          const t = getAgendaTallies(ag);
          agHtml += '<div class="p-4 rounded-xl border border-slate-200 bg-white space-y-2">' +
            '<div class="flex flex-wrap items-center justify-between gap-2">' +
              '<div class="flex items-center gap-1.5">' +
                '<span class="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-bold">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '</span>' +
                '<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold">' + highlightMatch(ag.targetArticle, q) + '</span>' +
                '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">' + escapeHtml(ag.proposer || ag.type) + '</span>' +
              '</div>' +
              '<button type="button" onclick="jumpToAgendaFromSearch('' + ag.id + '')" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline">투표 화면으로 이동 →</button>' +
            '</div>' +
            '<div class="text-sm font-extrabold text-slate-900">' + highlightMatch(ag.title, q) + '</div>' +
            '<div class="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-slate-800 whitespace-pre-line">' +
              '<strong class="text-indigo-800">[변경 조문]</strong> ' + highlightMatch(ag.afterText, q) +
            '</div>' +
            '<div class="text-xs text-slate-500 flex items-center justify-between">' +
              '<span>득표: 찬성 ' + t.approve + '(' + t.majorityThreshold + ') / 반대 ' + t.reject + ' / 기권 ' + t.abstain + '</span>' +
              '<span class="font-bold ' + (t.isAdopted ? 'text-emerald-600' : 'text-rose-600') + '">' + (t.isAdopted ? '가결' : '부결') + '</span>' +
            '</div>' +
          '</div>';
        });
      }
      document.getElementById("fullSearchAgendasList").innerHTML = agHtml;

      const filteredIssues = appState.issues.filter(function(iss) {
        return matchesSearch([
          iss.code,
          iss.title,
          iss.summary,
          (iss.relatedClauses || []).join(" "),
          (iss.keywords || []).join(" ")
        ], q);
      });
      document.getElementById("searchCountIssues").textContent = filteredIssues.length + "건";

      let issHtml = "";
      if (filteredIssues.length === 0) {
        issHtml = '<div class="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">일치하는 현안이 없습니다.</div>';
      } else {
        filteredIssues.forEach(function(iss) {
          issHtml += '<div class="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">' +
            '<div class="flex items-center justify-between">' +
              '<span class="px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-extrabold">' + escapeHtml(iss.code) + '</span>' +
              '<span class="text-xs font-bold text-amber-900">관련 조항: ' + highlightMatch((iss.relatedClauses || []).join(", "), q) + '</span>' +
            '</div>' +
            '<div class="text-sm font-extrabold text-slate-900">' + highlightMatch(iss.title, q) + '</div>' +
            '<p class="text-xs text-slate-700 leading-relaxed">' + highlightMatch(iss.summary, q) + '</p>' +
          '</div>';
        });
      }
      document.getElementById("fullSearchIssuesList").innerHTML = issHtml;
    }

    function renderDrawerSearchResults() {
      const q = appState.drawerSearchQuery;
      const container = document.getElementById("drawerSearchResultsContainer");

      const clauses = appState.bylaws.filter(function(cl) {
        return matchesSearch([cl.chapter, cl.articleNo, cl.title, cl.content, (cl.keywords || []).join(" ")], q);
      });
      const agendas = appState.agendas.filter(function(ag) {
        return matchesSearch([ag.codeName || "", ag.proposer || "", ag.targetArticle, ag.title, ag.beforeText, ag.afterText, ag.reason, (ag.relatedClauses || []).join(" "), (ag.keywords || []).join(" ")], q);
      });
      const issues = appState.issues.filter(function(iss) {
        return matchesSearch([iss.code, iss.title, iss.summary, (iss.relatedClauses || []).join(" "), (iss.keywords || []).join(" ")], q);
      });

      let html = "";

      html += '<div><div class="text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-2">현행 단칙 조항 (' + clauses.length + '건)</div><div class="space-y-2">';
      clauses.forEach(function(cl) {
        html += '<div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">' +
          '<div class="flex items-center justify-between">' +
            '<div class="text-xs font-extrabold text-slate-900">' + highlightMatch(cl.articleNo + " (" + cl.title + ")", q) + ' <span class="text-[11px] font-normal text-slate-500">· ' + escapeHtml(cl.chapter) + '</span></div>' +
            '<button type="button" onclick="openEditClauseModal('' + cl.id + '')" class="text-[11px] font-bold text-indigo-600 hover:underline">✎ 수정</button>' +
          '</div>' +
          '<p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">' + highlightMatch(cl.content, q) + '</p>' +
        '</div>';
      });
      html += '</div></div>';

      html += '<div><div class="text-xs font-extrabold text-emerald-700 uppercase tracking-wider mb-2">관련 상정 개정안·신규안 (' + agendas.length + '건)</div><div class="space-y-2">';
      agendas.forEach(function(ag) {
        html += '<div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">' +
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-extrabold text-emerald-900">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + ' · ' + highlightMatch(ag.targetArticle, q) + '</span>' +
            '<button type="button" onclick="selectAgenda('' + ag.id + ''); switchMainTab('voting'); toggleSearchDrawer(false);" class="text-xs font-bold text-indigo-600 underline">이 안건 보기</button>' +
          '</div>' +
          '<div class="text-xs font-bold text-slate-900">' + highlightMatch(ag.title, q) + '</div>' +
          '<p class="text-xs text-slate-700 whitespace-pre-line">' + highlightMatch(ag.afterText, q) + '</p>' +
        '</div>';
      });
      html += '</div></div>';

      html += '<div><div class="text-xs font-extrabold text-amber-700 uppercase tracking-wider mb-2">관련 총회 현안 (' + issues.length + '건)</div><div class="space-y-2">';
      issues.forEach(function(iss) {
        html += '<div class="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">' +
          '<div class="text-xs font-extrabold text-amber-900">' + escapeHtml(iss.code) + ' · ' + highlightMatch(iss.title, q) + '</div>' +
          '<p class="text-xs text-slate-700 leading-relaxed">' + highlightMatch(iss.summary, q) + '</p>' +
        '</div>';
      });
      html += '</div></div>';

      container.innerHTML = html;
    }

    function renderEventsView() {
      const schedContainer = document.getElementById("assemblyScheduleListContainer");
      if (schedContainer) {
        let sHtml = "";
        (appState.assemblySchedule || []).forEach(function(item) {
          let badgeClass = "bg-slate-100 text-slate-700";
          if (item.status === "완료") badgeClass = "bg-emerald-100 text-emerald-800";
          else if (item.status === "진행중") badgeClass = "bg-amber-100 text-amber-900";
          else if (item.status === "안건상정") badgeClass = "bg-indigo-100 text-indigo-800";

          let actionBtn = "";
          if (item.targetTab === "sectionConcertReview") {
            actionBtn = '<a href="#sectionConcertReview" class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[11px] hover:bg-indigo-100">요약보기 ↓</a>';
          } else if (item.targetTab) {
            actionBtn = '<button type="button" onclick="switchMainTab('' + escapeHtml(item.targetTab) + '')" class="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px]">' + escapeHtml(item.btnLabel || "바로가기 →") + '</button>';
          }

          sHtml += '<li class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition">' +
            '<div class="min-w-0">' +
              '<div class="flex flex-wrap items-center gap-1.5">' +
                '<span class="font-extrabold text-slate-900">' + escapeHtml(item.title) + '</span>' +
                '<span class="px-2 py-0.5 rounded font-bold text-[10px] ' + badgeClass + '">' + escapeHtml(item.status || "진행") + '</span>' +
              '</div>' +
              '<div class="text-xs text-slate-600 mt-0.5">' + escapeHtml(item.desc) + '</div>' +
            '</div>' +
            '<div class="flex items-center gap-1 shrink-0 self-end sm:self-center">' +
              actionBtn +
              '<button type="button" onclick="openScheduleModal('' + item.id + '')" class="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px]" title="식순 수정">✎ 수정</button>' +
              '<button type="button" onclick="deleteScheduleItem('' + item.id + '')" class="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[11px]" title="식순 삭제">삭제</button>' +
            '</div>' +
          '</li>';
        });
        if (!sHtml) {
          sHtml = '<li class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">등록된 식순이 없습니다. [+ 식순 추가] 버튼으로 추가해 주세요.</li>';
        }
        schedContainer.innerHTML = sHtml;
      }

      const container = document.getElementById("clubEventsTimelineList");
      if (!container) return;
      let html = "";
      appState.events.forEach(function(ev, index) {
        html += '<div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
          '<div class="space-y-1.5 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2">' +
              '<span class="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-extrabold">#' + (index + 1) + '</span>' +
              '<span class="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">' + escapeHtml(ev.category) + '</span>' +
              '<span class="text-xs font-bold text-slate-500">' + escapeHtml(ev.date) + '</span>' +
              '<span class="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">참여/성원 ' + ev.participantsCount + '명</span>' +
            '</div>' +
            '<h4 class="text-base font-extrabold text-slate-900">' + escapeHtml(ev.title) + '</h4>' +
            '<p class="text-xs sm:text-sm text-slate-700 leading-relaxed">' + escapeHtml(ev.summary) + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">' +
            '<button type="button" onclick="openEditEventModal('' + ev.id + '')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition">✎ 수정</button>' +
            '<button type="button" onclick="deleteEventItem('' + ev.id + '')" class="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition">🗑️ 삭제</button>' +
          '</div>' +
        '</div>';
      });
      if (!html) {
        html = '<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">등록된 행사 내역이 없습니다. [+ 행사 내역 추가] 버튼으로 추가해 주세요.</div>';
      }
      container.innerHTML = html;
    }

    function renderSettlementView() {
      const container = document.getElementById("settlementEventsList");
      if (!container) return;
      let html = "";
      appState.events.forEach(function(ev) {
        html += '<div class="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">' + escapeHtml(ev.title) + '</div>';
      });
      container.innerHTML = html;
    }

    function renderAdminView() {
      const majority = getMajorityThreshold(appState.totalAttendees);
      document.getElementById("adminInputTotalAttendees").value = appState.totalAttendees;
      document.getElementById("adminQuorumPreviewBadge").textContent = "2/3 가결 기준: " + majority + "표 이상 찬성";

      const tbody = document.getElementById("adminAgendasTableBody");
      let html = "";
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        const isCurrent = ag.id === appState.activeAgendaId;

        let statusBadge = "";
        if (ag.status === "adopted") {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">가결 확정</span>';
        } else if (ag.status === "rejected") {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 whitespace-nowrap">부결 확정</span>';
        } else if (ag.status === "active") {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 whitespace-nowrap">상정·투표중</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">대기</span>';
        }

        html += '<tr class="' + (isCurrent ? 'bg-indigo-50/40' : '') + '">' +
          '<td class="py-3 px-3 font-extrabold text-slate-900 whitespace-nowrap">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '</td>' +
          '<td class="py-3 px-3 whitespace-nowrap">' +
            '<span class="font-bold text-indigo-700">' + escapeHtml(ag.targetArticle) + '</span>' +
            '<span class="ml-1 text-xs text-slate-500">(' + escapeHtml(ag.proposer || ag.type) + ')</span>' +
          '</td>' +
          '<td class="py-3 px-3 font-semibold text-slate-900 max-w-xs">' + escapeHtml(ag.title) + '</td>' +
          '<td class="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">' +
            '<span class="text-emerald-700">' + t.approve + '</span> / ' +
            '<span class="text-rose-700">' + t.reject + '</span> / ' +
            '<span class="text-slate-600">' + t.abstain + '</span>' +
          '</td>' +
          '<td class="py-3 px-3 text-center whitespace-nowrap">' +
            (t.isAdopted
              ? '<span class="text-xs font-extrabold text-emerald-600">가결 (' + t.approve + '/' + t.majorityThreshold + ')</span>'
              : '<span class="text-xs font-semibold text-rose-600">부결 (' + t.approve + '/' + t.majorityThreshold + ')</span>') +
          '</td>' +
          '<td class="py-3 px-3 text-center">' + statusBadge + '</td>' +
          '<td class="py-3 px-3 text-right space-x-1 whitespace-nowrap">' +
            '<button type="button" onclick="adminPresentAgenda('' + ag.id + '')" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">상정</button>' +
            '<button type="button" onclick="adminSimulateVote('' + ag.id + '', 'approve')" class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">+찬성</button>' +
            '<button type="button" onclick="adminSimulateVote('' + ag.id + '', 'reject')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">+반대</button>' +
            '<button type="button" onclick="adminSimulateVote('' + ag.id + '', 'abstain')" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">+기권</button>' +
            '<button type="button" onclick="adminFinalizeSpecificAgenda('' + ag.id + '')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">마감확정</button>' +
          '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }

    function renderAuthModalMemberList() {
      const container = document.getElementById("authMemberListGrid");
      if (!container) return;
      const activeAg = getActiveAgenda();
      const votesMap = activeAg.memberVotes || {};
      const fKey = appState.authModalFilter || "all";
      const q = (appState.authModalSearch || "").trim().toLowerCase();

      ["all", "exec", "소프라노", "알토", "테너", "베이스"].forEach(function(k) {
        const btn = document.getElementById("btnAuthFilter-" + k);
        if (!btn) return;
        if (k === fKey) {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white";
        } else if (k === "exec") {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300";
        } else {
          btn.className = "px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50";
        }
      });

      const filtered = appState.members.filter(function(m) {
        if (fKey === "exec" && !m.isExecutive) return false;
        if (fKey !== "all" && fKey !== "exec" && m.basePart !== fKey) return false;
        if (q) {
          const hay = (m.name + " " + m.part + " " + (m.basePart || "") + " " + (m.execRole || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      let html = "";
      filtered.forEach(function(m) {
        const isSelected = m.id === appState.currentVoterId;
        const votedChoice = votesMap[m.id];
        const choiceLabel = votedChoice === "approve" ? "찬성 완료" : votedChoice === "reject" ? "반대 완료" : votedChoice === "abstain" ? "기권 완료" : "";

        html += '<button type="button" onclick="selectVoter('' + m.id + '')" class="p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1 ' +
          (isSelected ? 'border-2 border-indigo-600 bg-indigo-50/70' : 'border-slate-200 hover:bg-slate-50') + '">' +
          '<div class="min-w-0">' +
            '<div class="text-xs font-extrabold text-slate-900 truncate">' +
              escapeHtml(m.name) + ' <span class="text-indigo-600 font-semibold">(' + escapeHtml(m.part) + ')</span>' +
            '</div>' +
            '<div class="text-[11px] text-slate-500">휴대폰 뒷자리 인증</div>' +
          '</div>' +
          (votedChoice ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 bg-emerald-100 text-emerald-800">' + choiceLabel + '</span>' : '') +
        '</button>';
      });
      container.innerHTML = html;
    }
