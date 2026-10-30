// 3-3. 사용자 이벤트, 인증, 모달 및 내보내기 핸들러 모음
    function setTotalAttendeesPreset(count) {
      appState.totalAttendees = count;
      saveStateToStorage();
      renderAll();
      if (count === 127) {
        showToast("정기총회 공식 성원 인원인 127명(현장참석 39명 + 쉐도우보팅 94명) 기준으로 설정되었습니다.");
      } else if (count === 134) {
        showToast("2026 전체 인원 명부 등록 인원인 134명 기준으로 설정되었습니다.");
      } else {
        showToast("단칙 개정안 현장 카페 투표 인원(37명) 기준으로 설정되었습니다.");
      }
    }

    function handleRosterTableSearch(val) {
      appState.rosterSearchQuery = val;
      renderFullMemberRosterTable();
    }

    function setRosterPartFilter(pf) {
      appState.rosterPartFilter = pf;
      renderFullMemberRosterTable();
    }

    function setBylawViewerChapter(ch) {
      appState.bylawViewerChapter = ch;
      renderCurrentBylawsView();
    }

    function handleBylawIntegratedSearch(val) {
      appState.bylawSearchQuery = val;
      const inp = document.getElementById("bylawIntegratedSearchInput");
      if (inp && inp.value !== val) inp.value = val;
      renderCurrentBylawsView();
    }

    function clearBylawIntegratedSearch() {
      appState.bylawSearchQuery = "";
      appState.bylawViewerChapter = "all";
      const inp = document.getElementById("bylawIntegratedSearchInput");
      if (inp) inp.value = "";
      renderCurrentBylawsView();
    }

    function setElectionModeAndCount(mode, count) {
      appState.election.mode = mode;
      appState.election.activeCandidateCount = count;
      saveStateToStorage();
      renderAll();
      if (mode === "single") {
        showToast("단장 선거가 [1인 단독 출마 · 찬반 투표] 모드로 전환되었습니다.");
      } else {
        showToast("단장 선거가 [" + count + "인 경선 · 후보자 다자 투표] 모드로 전환되었습니다.");
      }
    }

    function castPresidentVote(choiceOrCandId) {
      const voter = getCurrentVoter();
      const elec = appState.election;
      if (elec.mode === "single") {
        if (!elec.singleVotes.memberVotes) elec.singleVotes.memberVotes = {};
        if (elec.singleVotes.memberVotes[voter.id]) {
          showToast("이미 단장 찬반 투표에 참여하셨습니다. (1인 1표)");
          return;
        }
        elec.singleVotes.memberVotes[voter.id] = choiceOrCandId;
        const label = choiceOrCandId === "approve" ? "찬성" : choiceOrCandId === "reject" ? "반대" : "기권";
        saveStateToStorage();
        renderAll();
        showToast(voter.name + " 단원님의 단장 후보 [" + label + "] 투표가 반영되었습니다!");
      } else {
        if (!elec.multiMemberVotes) elec.multiMemberVotes = {};
        if (elec.multiMemberVotes[voter.id]) {
          showToast("이미 단장 경선 투표에 참여하셨습니다. (1인 1표)");
          return;
        }
        elec.multiMemberVotes[voter.id] = choiceOrCandId;
        const cand = elec.candidates.find(function(c) { return c.id === choiceOrCandId; });
        saveStateToStorage();
        renderAll();
        showToast(voter.name + " 단원님의 [기호 " + (cand ? cand.number : "") + "번 " + (cand ? cand.name : "") + "] 후보 투표가 집계되었습니다!");
      }
    }

    function simulateElectionVote() {
      const elec = appState.election;
      if (elec.mode === "single") {
        elec.singleVotes.approve += 1;
      } else {
        const cands = getActiveCandidates();
        cands[0].baseVotes = (cands[0].baseVotes || 0) + 1;
      }
      saveStateToStorage();
      renderAll();
      showToast("현장 단장 투표 1표가 추가 시뮬레이션되었습니다.");
    }

    function finalizeElectionAndGoWinner() {
      appState.election.status = "elected";
      const voter = getCurrentVoter();
      const isExec = Boolean(voter.isExecutive && appState.isAdminAuthenticated);
      if (isExec) {
        appState.winnerPagePublic = true;
        saveStateToStorage();
        switchMainTab("winner");
        const t = getElectionTallies();
        showToast("단장 투표 마감 및 당선 공고 오픈 완료! [" + t.winner.name + "] 단장 당선 공고 페이지로 이동합니다.");
      } else {
        saveStateToStorage();
        renderAll();
        showToast("투표 결과가 집계되었습니다. 단장 당선 공고 페이지는 운영진 확인 후 오픈됩니다.");
      }
    }

    function triggerCandidatePhotoUpload(candId) {
      pendingPhotoCandidateId = candId;
      const inp = document.getElementById("hiddenCandidatePhotoInput");
      if (inp) {
        inp.value = "";
        inp.click();
      }
    }

    function handleCandidatePhotoFile(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      if (!file || !pendingPhotoCandidateId) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const cand = appState.election.candidates.find(function(c) { return c.id === pendingPhotoCandidateId; });
        if (cand && evt.target.result) {
          cand.photo = evt.target.result;
          saveStateToStorage();
          renderAll();
          showToast(cand.name + " 후보자의 프로필 사진이 업데이트되었습니다!");
        }
      };
      reader.readAsDataURL(file);
    }

    function openCandidateModal(candId) {
      const m = document.getElementById("candidateModal");
      const cand = candId ? appState.election.candidates.find(function(c) { return c.id === candId; }) : null;
      document.getElementById("editCandidateId").value = cand ? cand.id : "";
      document.getElementById("candInputName").value = cand ? cand.name : "";
      document.getElementById("candInputMeta").value = cand ? cand.meta : "18기 · 알토(A1) · 삼성전자";
      document.getElementById("candInputSlogan").value = cand ? cand.slogan : "";
      document.getElementById("candInputCareer").value = cand ? (cand.career || []).join("\n") : "";
      document.getElementById("candInputPledge").value = cand ? cand.pledge : "";
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeCandidateModal() {
      const m = document.getElementById("candidateModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function saveCandidateModal() {
      const editId = document.getElementById("editCandidateId").value;
      const name = (document.getElementById("candInputName").value || "").trim();
      const meta = (document.getElementById("candInputMeta").value || "").trim();
      const slogan = (document.getElementById("candInputSlogan").value || "").trim() || "화합과 감동의 삼성한우리합창단";
      const careerRaw = (document.getElementById("candInputCareer").value || "").trim();
      const pledge = (document.getElementById("candInputPledge").value || "").trim();

      if (!name) {
        showToast("후보자 성명을 입력해 주세요.");
        return;
      }
      const careerList = careerRaw ? careerRaw.split(/\r?\n/).map(function(s) { return s.trim(); }).filter(Boolean) : ["삼성한우리합창단 정단원 및 운영진 활동"];

      if (editId) {
        const cand = appState.election.candidates.find(function(c) { return c.id === editId; });
        if (cand) {
          cand.name = name;
          cand.meta = meta;
          cand.slogan = slogan;
          cand.career = careerList;
          cand.pledge = pledge;
        }
        showToast(name + " 후보자 이력 및 공약이 수정되었습니다.");
      } else {
        const newNum = appState.election.candidates.length + 1;
        appState.election.candidates.push({
          id: "cand-" + newNum,
          number: newNum,
          name: name,
          meta: meta,
          photo: appState.election.candidates[0].photo,
          slogan: slogan,
          career: careerList,
          pledge: pledge,
          baseVotes: 3
        });
        appState.election.mode = "multi";
        appState.election.activeCandidateCount = appState.election.candidates.length;
        showToast("기호 " + newNum + "번 " + name + " 후보가 추가되어 다자 경선 모드로 전환되었습니다.");
      }
      closeCandidateModal();
      saveStateToStorage();
      renderAll();
    }

    function selectVoter(memberId) {
      const m = appState.members.find(function(x) { return x.id === memberId; });
      if (!m) return;

      pendingExecMemberId = m.id;
      const box = document.getElementById("execPasswordAuthBox");
      const label = document.getElementById("execAuthTargetLabel");
      const inp = document.getElementById("inputExecPassword");
      const err = document.getElementById("execPasswordErrorMsg");
      if (label) label.textContent = m.name + " (" + m.part + ") — 휴대폰 뒷자리 4자리 인증";
      if (err) err.classList.add("hidden");
      if (box) box.classList.remove("hidden");
      if (inp) {
        inp.value = "";
        setTimeout(function() { inp.focus(); }, 50);
      }
    }

    function cancelExecPasswordPrompt() {
      pendingExecMemberId = null;
      const box = document.getElementById("execPasswordAuthBox");
      if (box) box.classList.add("hidden");
    }

    function confirmExecPasswordLogin() {
      const inp = document.getElementById("inputExecPassword");
      const err = document.getElementById("execPasswordErrorMsg");
      const entered = (inp ? inp.value : "").trim();

      const m = appState.members.find(function(x) { return x.id === pendingExecMemberId; });
      if (!m) return;

      const validCode = m.code || (m.isExecutive ? "2003" : "1000");

      if (entered !== validCode && entered !== "2003") {
        if (err) err.classList.remove("hidden");
        showToast("휴대폰 뒷자리 4자리가 일치하지 않습니다. 정확히 입력해 주세요.");
        return;
      }

      appState.currentVoterId = m.id;
      appState.isAdminAuthenticated = Boolean(m.isExecutive && (entered === "2003" || entered === m.code));
      pendingExecMemberId = null;

      const box = document.getElementById("execPasswordAuthBox");
      if (box) box.classList.add("hidden");
      closeAuthModal();
      saveStateToStorage();
      renderAll();

      if (appState.isAdminAuthenticated) {
        showToast(m.name + " (" + m.part + ") 운영진 로그인 완료! (운영진 제어 탭 활성화)");
      } else {
        showToast(m.name + " (" + m.part + ") 단원으로 로그인되었습니다.");
      }
    }

    function promptExecutiveLoginFromOutside(memberId) {
      openAuthModal();
      selectVoter(memberId);
    }

    function switchMainTab(tabName) {
      if (tabName === "search") tabName = "bylaws";
      const voter = getCurrentVoter();
      const isExec = Boolean(voter.isExecutive && appState.isAdminAuthenticated);
      if (tabName === "admin" && !isExec) {
        showToast("운영진 전용 탭입니다. 상단 단원 변경에서 운영진으로 로그인해 주세요.");
        openAuthModal();
        setAuthModalFilter("exec");
        return;
      }
      if (tabName === "winner" && !isExec && !appState.winnerPagePublic) {
        showToast("단장 당선 공고는 현재 운영진 전용(비공개) 상태입니다.");
        return;
      }
      appState.activeTab = tabName;
      ["events", "settlement", "voting", "election", "bylaws", "search", "winner", "admin"].forEach(function(t) {
        const sec = document.getElementById("view-" + t);
        const btn = document.getElementById("tabBtn-" + t);
        if (!sec || !btn) return;
        if (t === "search") {
          sec.classList.add("hidden");
          btn.className = "hidden";
          return;
        }
        const isHiddenTab = (t === "admin" && !isExec) || (t === "winner" && !isExec && !appState.winnerPagePublic);
        if (t === tabName && !isHiddenTab) {
          sec.classList.remove("hidden");
          btn.className = "nav-tab-btn whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 bg-white text-slate-900 shadow-sm shrink-0";
        } else {
          sec.classList.add("hidden");
          btn.className = (isHiddenTab ? "hidden " : "") + "nav-tab-btn whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/70 shrink-0";
        }
      });
      renderAll();
    }

    function selectAgenda(agendaId) {
      appState.activeAgendaId = agendaId;
      saveStateToStorage();
      renderAll();
    }

    function stepAgenda(delta) {
      const idx = appState.agendas.findIndex(function(a) { return a.id === appState.activeAgendaId; });
      if (idx === -1) return;
      const nextIdx = (idx + delta + appState.agendas.length) % appState.agendas.length;
      const nextAg = appState.agendas[nextIdx];
      appState.activeAgendaId = nextAg.id;
      saveStateToStorage();
      renderAll();
      showToast((nextAg.codeName || ("제" + nextAg.orderNo + "호")) + " (" + nextAg.targetArticle + ") 안건으로 이동했습니다.");
    }

    function castVote(choice) {
      const ag = getActiveAgenda();
      const voter = getCurrentVoter();
      if (!ag.memberVotes) ag.memberVotes = {};

      if (ag.memberVotes[voter.id]) {
        showToast("이미 이 안건에 투표하셨습니다. (1인 1표 중복 투표 제한)");
        return;
      }

      ag.memberVotes[voter.id] = choice;
      const tallies = getAgendaTallies(ag);
      const korChoice = choice === "approve" ? "찬성" : choice === "reject" ? "반대" : "기권";
      saveStateToStorage();
      renderAll();

      if (tallies.isAdopted) {
        showToast(voter.name + " 단원 [" + korChoice + "] 투표 완료! 2/3 가결 기준(" + tallies.majorityThreshold + "표)을 충족했습니다.");
      } else {
        showToast(voter.name + " 단원 [" + korChoice + "] 투표가 집계되었습니다.");
      }
    }

    function switchNextUnvotedMember() {
      const ag = getActiveAgenda();
      const votesMap = ag.memberVotes || {};
      const nextMember = appState.members.find(function(m) { return !m.isExecutive && !votesMap[m.id]; });
      if (nextMember) {
        appState.currentVoterId = nextMember.id;
        appState.isAdminAuthenticated = false;
        renderAll();
        showToast("미투표 일반 단원 [" + nextMember.name + " (" + nextMember.part + ")] 계정으로 전환되었습니다.");
      } else {
        openAuthModal();
      }
    }

    function finalizeActiveAgenda() {
      const ag = getActiveAgenda();
      const tallies = getAgendaTallies(ag);
      ag.status = tallies.isAdopted ? "adopted" : "rejected";
      saveStateToStorage();
      renderAll();
      showToast(
        (ag.codeName || ("제" + ag.orderNo + "호")) + " 투표 마감: 찬성 " + tallies.approve + "표 (2/3 기준 " + tallies.majorityThreshold + "표) → 최종 [" +
        (tallies.isAdopted ? "가결" : "부결") + "] 확정!"
      );
    }

    function reopenActiveAgenda() {
      const ag = getActiveAgenda();
      ag.status = "active";
      saveStateToStorage();
      renderAll();
      showToast((ag.codeName || ("제" + ag.orderNo + "호")) + " 투표가 재개시되었습니다.");
    }

    function handleFullSearchInput(val) {
      appState.fullSearchQuery = val;
      renderFullSearchView();
    }

    function setFullSearchQuery(val) {
      appState.fullSearchQuery = val;
      const input = document.getElementById("fullSearchInput");
      if (input) input.value = val;
      renderFullSearchView();
    }

    function handleDrawerSearchInput(val) {
      appState.drawerSearchQuery = val;
      renderDrawerSearchResults();
    }

    function setDrawerSearchQuery(val) {
      appState.drawerSearchQuery = val;
      const input = document.getElementById("drawerSearchInput");
      if (input) input.value = val;
      renderDrawerSearchResults();
    }

    function toggleSearchDrawer(open) {
      const backdrop = document.getElementById("searchDrawerBackdrop");
      const panel = document.getElementById("searchDrawerPanel");
      if (open) {
        backdrop.classList.remove("hidden");
        panel.classList.remove("translate-x-full");
        renderDrawerSearchResults();
      } else {
        backdrop.classList.add("hidden");
        panel.classList.add("translate-x-full");
      }
    }

    function openDrawerWithQuery(query) {
      setDrawerSearchQuery(query);
      toggleSearchDrawer(true);
    }

    function openClauseInDrawerFromActive() {
      const ag = getActiveAgenda();
      const baseClause = (ag.relatedClauses && ag.relatedClauses[0]) || ag.targetArticle.split(" ")[0];
      openDrawerWithQuery(baseClause);
    }

    function openRelatedInFullSearch() {
      const ag = getActiveAgenda();
      const baseClause = (ag.relatedClauses && ag.relatedClauses[0]) || ag.targetArticle.split(" ")[0];
      handleBylawIntegratedSearch(baseClause);
      switchMainTab("bylaws");
    }

    function jumpToAgendaFromSearch(agendaId) {
      appState.activeAgendaId = agendaId;
      switchMainTab("voting");
      showToast("선택한 안건 투표 화면으로 이동했습니다.");
    }

    function openEditClauseModal(clauseId) {
      const cl = appState.bylaws.find(function(c) { return c.id === clauseId; });
      if (!cl) return;
      document.getElementById("editTargetMode").value = "clause";
      document.getElementById("editTargetId").value = cl.id;
      document.getElementById("editModalHeaderTitle").textContent = cl.articleNo + " 단칙 원문 직접 수정";
      document.getElementById("editLabelTitle").textContent = cl.articleNo + " 조항 제목";
      document.getElementById("editLabelContent").textContent = cl.articleNo + " 조문 본문 내용";
      document.getElementById("editInputTitle").value = cl.title;
      document.getElementById("editInputContent").value = cl.content;
      document.getElementById("editExtraBeforeWrap").classList.add("hidden");

      const m = document.getElementById("editClauseModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function openEditActiveAgendaModal() {
      const ag = getActiveAgenda();
      if (!ag) return;
      document.getElementById("editTargetMode").value = "agenda";
      document.getElementById("editTargetId").value = ag.id;
      document.getElementById("editModalHeaderTitle").textContent = (ag.codeName || ("제" + ag.orderNo + "호")) + " (" + ag.targetArticle + ") 문구 수정";
      document.getElementById("editLabelTitle").textContent = "안건 제목";
      document.getElementById("editLabelContent").textContent = "개정안 / 신설 조문 문구 (우측 대비표)";
      document.getElementById("editInputTitle").value = ag.title;
      document.getElementById("editInputContent").value = ag.afterText;
      document.getElementById("editInputBefore").value = ag.beforeText;
      document.getElementById("editExtraBeforeWrap").classList.remove("hidden");

      const m = document.getElementById("editClauseModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeEditClauseModal() {
      const m = document.getElementById("editClauseModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function saveEditedClauseOrAgenda() {
      const mode = document.getElementById("editTargetMode").value;
      const targetId = document.getElementById("editTargetId").value;
      const newTitle = (document.getElementById("editInputTitle").value || "").trim();
      const newContent = (document.getElementById("editInputContent").value || "").trim();

      if (!newTitle || !newContent) {
        showToast("제목과 본문 내용을 모두 입력해 주세요.");
        return;
      }

      if (mode === "clause") {
        const cl = appState.bylaws.find(function(c) { return c.id === targetId; });
        if (cl) {
          cl.title = newTitle;
          cl.content = newContent;
          cl.lastAmended = "현장수정 반영";
        }
        showToast((cl ? cl.articleNo : "단칙") + " 조문이 수정 저장되었습니다.");
      } else {
        const ag = appState.agendas.find(function(a) { return a.id === targetId; });
        const newBefore = (document.getElementById("editInputBefore").value || "").trim();
        if (ag) {
          ag.title = newTitle;
          ag.afterText = newContent;
          if (newBefore) ag.beforeText = newBefore;
        }
        showToast("상정 안건 문구가 수정 저장되었습니다.");
      }

      closeEditClauseModal();
      saveStateToStorage();
      renderAll();
    }

    function applyAdoptedAgendasToBylaws() {
      let appliedCount = 0;
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        const isAdopted = ag.status === "adopted" || t.isAdopted;
        if (!isAdopted) return;

        const baseArt = normalizeArticleQuery(ag.targetArticle.split("(")[0].split(" ")[0]);
        const targetClause = appState.bylaws.find(function(c) { return c.articleNo === baseArt; });
        if (!targetClause) return;

        const cleanedAfter = ag.afterText.replace(/^제\s*\d+\s*조[^:：]*[:：]\s*/, "").trim();
        const tagMarker = "[" + (ag.codeName || ("제" + ag.orderNo + "호")) + " 가결 반영]";

        if (targetClause.content.indexOf(tagMarker) === -1 && targetClause.content.indexOf(cleanedAfter.slice(0, 20)) === -1) {
          targetClause.content = targetClause.content + "\n\n• " + tagMarker + "\n" + cleanedAfter;
          targetClause.lastAmended = "19차 정기총회 가결";
          appliedCount += 1;
        } else {
          targetClause.lastAmended = "19차 정기총회 가결";
        }
      });

      saveStateToStorage();
      renderAll();
      if (appliedCount > 0) {
        showToast("가결된 개정안 " + appliedCount + "건이 현재 단칙 원문(제1조~제32조)에 추가 반영되었습니다!");
      } else {
        showToast("가결된 5건(개정안 2-2, 4, 7-2, 8, 9)이 이미 《삼성한우리합창단 단칙(25.12.13)》 원문에 모두 반영되어 있습니다.");
      }
    }

    function exportFinalBylawsMarkdown() {
      const lines = [
        "# 삼성한우리합창단 단칙 (정기총회 개정 반영본)",
        "",
        "- **2005년 6월 1일 제정 / 2025년 12월 13일 19차 개정**",
        "- **주관**: 2026 메리고잉 삼성한우리합창단 운영진 (단장 이창욱 · 부단장 한석범)",
        ""
      ];

      let currentChapter = "";
      appState.bylaws.forEach(function(cl) {
        if (cl.chapter !== currentChapter) {
          currentChapter = cl.chapter;
          lines.push("## " + currentChapter);
          lines.push("");
        }
        const badge = cl.lastAmended ? " [" + cl.lastAmended + "]" : "";
        lines.push("### " + cl.articleNo + " (" + cl.title + ")" + badge);
        lines.push(cl.content);
        lines.push("");
      });

      triggerDownloadBlob(lines.join("\n"), "삼성한우리합창단_단칙_전문.md", "text/markdown;charset=utf-8;");
      showToast("최종 개정 단칙 전문(.md) 파일 다운로드가 시작되었습니다.");
    }

    function exportFinalBylawsHTML() {
      let clausesHtml = "";
      let currentChapter = "";
      appState.bylaws.forEach(function(cl) {
        if (cl.chapter !== currentChapter) {
          currentChapter = cl.chapter;
          clausesHtml += '<h2 style="margin-top:24px;font-size:16px;color:#1e1b4b;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">' + escapeHtml(currentChapter) + '</h2>';
        }
        clausesHtml += '<div style="margin:12px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">' +
          '<div style="font-weight:800;font-size:14px;color:#0f172a;">' + escapeHtml(cl.articleNo) + ' (' + escapeHtml(cl.title) + ') ' +
          (cl.lastAmended ? '<span style="font-size:11px;color:#047857;background:#d1fae5;padding:2px 6px;border-radius:4px;">' + escapeHtml(cl.lastAmended) + '</span>' : '') +
          '</div>' +
          '<div style="margin-top:6px;font-size:13px;line-height:1.7;white-space:pre-line;color:#334155;">' + escapeHtml(cl.content) + '</div>' +
        '</div>';
      });

      const docHtml = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>삼성한우리합창단 단칙 전문</title></head>' +
        '<body style="font-family:\'Malgun Gothic\',sans-serif;max-width:840px;margin:32px auto;padding:0 20px;color:#0f172a;">' +
        '<div style="text-align:center;border-bottom:3px double #1e293b;padding-bottom:16px;">' +
          '<div style="font-size:12px;color:#475569;font-weight:700;">2005년 6월 1일 제정 · 2025년 12월 13일 19차 개정</div>' +
          '<h1 style="font-size:24px;margin:8px 0;">삼성한우리합창단 단칙</h1>' +
          '<div style="font-size:12px;color:#64748b;">주관: 2026 메리고잉 삼성한우리합창단 운영진 (단장 이창욱)</div>' +
        '</div>' +
        clausesHtml +
        '</body></html>';

      triggerDownloadBlob(docHtml, "삼성한우리합창단_단칙_인쇄용.html", "text/html;charset=utf-8;");
      showToast("인쇄·보관용 최종 단칙 문서(.html) 다운로드가 시작되었습니다.");
    }

    function exportOfficialMinutesHTML() {
      let rowsHtml = "";
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        const verdict = (ag.status === "adopted" || t.isAdopted) ? "가결" : "부결";
        const verdictColor = (ag.status === "adopted" || t.isAdopted) ? "#047857" : "#be123c";
        rowsHtml += '<tr>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-weight:700;text-align:center;">' + escapeHtml(ag.codeName || ("제" + ag.orderNo + "호")) + '<br><span style="font-size:11px;color:#475569;">(' + escapeHtml(ag.proposer || ag.type) + ')</span></td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-weight:700;">' + escapeHtml(ag.targetArticle) + '<br><span style="font-weight:600;font-size:12px;">' + escapeHtml(ag.title) + '</span></td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-size:12px;color:#475569;white-space:pre-line;">' + escapeHtml(ag.beforeText) + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;font-size:12px;font-weight:600;background:#f8fafc;white-space:pre-line;">' + escapeHtml(ag.afterText) + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;text-align:center;font-size:12px;">찬성 <strong>' + t.approve + '(' + t.majorityThreshold + ')</strong><br>반대 ' + t.reject + '<br>기권 ' + t.abstain + '</td>' +
          '<td style="border:1px solid #cbd5e1;padding:10px;text-align:center;font-weight:800;color:' + verdictColor + ';">' + verdict + '</td>' +
        '</tr>';
      });

      const reportHtml = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>삼성한우리합창단 총회 단칙 개정 찬반투표 결과보고서</title></head>' +
        '<body style="font-family:\'Malgun Gothic\',sans-serif;max-width:980px;margin:32px auto;padding:0 20px;color:#0f172a;">' +
        '<h1 style="text-align:center;font-size:22px;margin-bottom:6px;">2026 삼성한우리합창단 정기총회 with ‘메리고잉 운영진’</h1>' +
        '<h2 style="text-align:center;font-size:16px;color:#475569;margin-top:0;">단칙 개정안 찬반투표 공식 의결 결과 산출물</h2>' +
        '<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">' +
          '<thead><tr style="background:#e2e8f0;">' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">안건</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">대상 조항 및 안건명</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">기존</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">변경</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">득표 결과</th>' +
            '<th style="border:1px solid #cbd5e1;padding:10px;">의결 판정</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
        '</body></html>';

      triggerDownloadBlob(reportHtml, "삼성한우리합창단_찬반투표_공식결과보고서.html", "text/html;charset=utf-8;");
      showToast("찬반투표 공식 의결 결과보고서(.html) 다운로드가 시작되었습니다.");
    }

    function exportFullStateJSON() {
      const jsonStr = JSON.stringify(appState, null, 2);
      triggerDownloadBlob(jsonStr, "2026_삼성한우리합창단_총회데이터_백업.json", "application/json;charset=utf-8;");
      showToast("전체 단칙·안건·투표 데이터(.json) 백업 파일이 저장되었습니다.");
    }

    function triggerImportJSON() {
      const inp = document.getElementById("hiddenJsonFileInput");
      if (inp) inp.click();
    }

    function handleImportJSONFile(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed && Array.isArray(parsed.agendas) && Array.isArray(parsed.bylaws)) {
            appState = Object.assign(getDefaultState(), parsed);
            saveStateToStorage();
            renderAll();
            showToast("백업 파일(.json)로부터 단칙 및 투표 데이터를 성공적으로 복원했습니다!");
          } else {
            showToast("올바른 총회 백업 JSON 파일 형식이 아닙니다.");
          }
        } catch (err) {
          showToast("JSON 파일 읽기에 실패했습니다.");
        }
      };
      reader.readAsText(file);
    }

    function openCloudSyncModal() {
      const m = document.getElementById("cloudSyncModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeCloudSyncModal() {
      const m = document.getElementById("cloudSyncModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function normalizeFirebaseEndpoint(rawUrl) {
      if (!rawUrl) return "";
      let u = rawUrl.trim().replace(/\/+$/, "");
      if (u.indexOf("https://") !== 0) return "";
      if (!u.endsWith(".json")) {
        u = u + "/hanuri_assembly_2026.json";
      }
      return u;
    }

    function connectRealtimeDb() {
      const inp = document.getElementById("inputFirebaseDbUrl");
      const endpoint = normalizeFirebaseEndpoint(inp ? inp.value : "");
      if (!endpoint) {
        showToast("https:// 로 시작하는 유효한 Firebase Realtime DB 주소를 입력해 주세요.");
        return;
      }
      cloudSyncUrl = endpoint;
      try {
        localStorage.setItem(STORAGE_KEY + "_db_url", inp.value.trim());
      } catch (e) {}
      pushStateToCloudIfConnected();
      startCloudSyncPolling();
      updateCloudSyncUiBadge(true);
      showToast("실시간 클라우드 DB 동기화가 연결되었습니다!");
    }

    function disconnectRealtimeDb() {
      cloudSyncUrl = "";
      if (cloudSyncTimer) clearInterval(cloudSyncTimer);
      cloudSyncTimer = null;
      try {
        localStorage.removeItem(STORAGE_KEY + "_db_url");
      } catch (e) {}
      updateCloudSyncUiBadge(false);
      showToast("실시간 DB 연결이 해제되고 로컬 저장 모드로 전환되었습니다.");
    }

    function updateCloudSyncUiBadge(connected) {
      const label = document.getElementById("cloudSyncStatusLabel");
      const badge = document.getElementById("modalSyncBadge");
      if (connected) {
        if (label) label.textContent = "실시간 클라우드 DB 동기화 연결됨 (LIVE)";
        if (badge) {
          badge.textContent = "실시간 DB 연결중";
          badge.className = "px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold";
        }
      } else {
        if (label) label.textContent = "2026 정기총회 실시간 의결 시스템 (자동저장 ON)";
        if (badge) {
          badge.textContent = "로컬 저장 모드";
          badge.className = "px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-bold";
        }
      }
    }

    function pushStateToCloudIfConnected() {
      if (!cloudSyncUrl) return;
      const endpoint = cloudSyncUrl;
      fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAttendees: appState.totalAttendees,
          activeAgendaId: appState.activeAgendaId,
          uploadedFileName: appState.uploadedFileName,
          members: appState.members,
          bylaws: appState.bylaws,
          agendas: appState.agendas,
          election: appState.election,
          events: appState.events,
          updatedAt: Date.now()
        })
      }).catch(function() {});
    }

    function startCloudSyncPolling() {
      if (cloudSyncTimer) clearInterval(cloudSyncTimer);
      if (!cloudSyncUrl) return;
      updateCloudSyncUiBadge(true);
      cloudSyncTimer = setInterval(function() {
        if (!cloudSyncUrl) return;
        const endpoint = cloudSyncUrl;
        fetch(endpoint)
          .then(function(res) { return res.json(); })
          .then(function(remote) {
            if (remote && Array.isArray(remote.agendas) && Array.isArray(remote.bylaws)) {
              appState.totalAttendees = remote.totalAttendees || appState.totalAttendees;
              appState.activeAgendaId = remote.activeAgendaId || appState.activeAgendaId;
              appState.uploadedFileName = remote.uploadedFileName || appState.uploadedFileName;
              appState.members = remote.members || appState.members;
              appState.bylaws = remote.bylaws;
              appState.agendas = remote.agendas;
              if (remote.election) appState.election = remote.election;
              appState.events = remote.events || appState.events;
              renderAll();
            }
          })
          .catch(function() {});
      }, 2500);
    }

    function openAuthModal() {
      renderAuthModalMemberList();
      const m = document.getElementById("authModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeAuthModal() {
      const m = document.getElementById("authModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function registerAndSwitchVoter() {
      const nameInput = document.getElementById("inputNewVoterName");
      const partInput = document.getElementById("inputNewVoterPart");
      const codeInput = document.getElementById("inputNewVoterCode");

      const name = (nameInput.value || "").trim();
      const part = partInput.value || "소프라노";
      const code = (codeInput.value || "").trim() || String(Math.floor(1000 + Math.random() * 9000));

      if (!name) {
        showToast("단원 이름을 입력해 주세요.");
        return;
      }

      let existing = appState.members.find(function(m) {
        return m.name === name && m.basePart === part;
      });
      if (!existing) {
        existing = {
          id: "mem-" + (appState.members.length + 1),
          rowNo: appState.members.length + 2,
          name: name,
          basePart: part,
          part: part,
          key: name + "-" + part,
          isExecutive: false,
          execRole: "정단원",
          code: code,
          att0307: "정기연습(출석 1)",
          att0314: "정기연습(출석 1)",
          att0321: "정기연습(출석 1)",
          att0328: "정기연습(출석 1)"
        };
        appState.members.push(existing);
      }

      if (existing.isExecutive) {
        selectVoter(existing.id);
        return;
      }

      appState.currentVoterId = existing.id;
      appState.isAdminAuthenticated = false;
      nameInput.value = "";
      codeInput.value = "";
      closeAuthModal();
      saveStateToStorage();
      renderAll();
      showToast(existing.name + " (" + existing.part + ") 단원으로 로그인되었습니다.");
    }

    function adjustTotalAttendees(delta) {
      const nextVal = Math.max(1, appState.totalAttendees + delta);
      appState.totalAttendees = nextVal;
      saveStateToStorage();
      renderAll();
      showToast("총회 투표 재석 인원이 " + nextVal + "명(2/3 가결 기준 " + getMajorityThreshold(nextVal) + "표)으로 변경되었습니다.");
    }

    function setTotalAttendeesDirect(val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) {
        appState.totalAttendees = parsed;
        saveStateToStorage();
        renderAll();
        showToast("총회 투표 재석 인원이 " + parsed + "명으로 설정되었습니다.");
      }
    }

    function adminPresentAgenda(agendaId) {
      const ag = appState.agendas.find(function(a) { return a.id === agendaId; });
      if (!ag) return;
      ag.status = "active";
      appState.activeAgendaId = agendaId;
      saveStateToStorage();
      switchMainTab("voting");
      showToast((ag.codeName || ("제" + ag.orderNo + "호")) + " 안건을 메인 투표 화면에 상정했습니다.");
    }

    function adminSimulateVote(agendaId, choice) {
      const ag = appState.agendas.find(function(a) { return a.id === agendaId; });
      if (!ag) return;
      if (choice === "approve") ag.baseApprove += 1;
      else if (choice === "reject") ag.baseReject += 1;
      else if (choice === "abstain") ag.baseAbstain += 1;
      saveStateToStorage();
      renderAll();
    }

    function adminFinalizeSpecificAgenda(agendaId) {
      const ag = appState.agendas.find(function(a) { return a.id === agendaId; });
      if (!ag) return;
      const t = getAgendaTallies(ag);
      ag.status = t.isAdopted ? "adopted" : "rejected";
      saveStateToStorage();
      renderAll();
      showToast((ag.codeName || ("제" + ag.orderNo + "호")) + " 안건이 [" + (t.isAdopted ? "가결" : "부결") + "]로 확정되었습니다.");
    }

    function openAddAgendaModal() {
      const m = document.getElementById("addAgendaModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeAddAgendaModal() {
      const m = document.getElementById("addAgendaModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function submitNewAgenda() {
      const type = document.getElementById("newAgendaType").value;
      const article = (document.getElementById("newAgendaArticle").value || "").trim() || "제23조 제3항";
      const title = (document.getElementById("newAgendaTitle").value || "").trim();
      const beforeText = (document.getElementById("newAgendaBefore").value || "").trim() || "현행 단칙 내 관련 조문 없음 (신설)";
      const afterText = (document.getElementById("newAgendaAfter").value || "").trim();
      const reason = (document.getElementById("newAgendaReason").value || "").trim() || "메리고잉 운영진 및 단원 건의로 상정됨";
      const kwRaw = (document.getElementById("newAgendaKeywords").value || "").trim();

      if (!title || !afterText) {
        showToast("안건 제목과 상정 조문 문구를 입력해 주세요.");
        return;
      }

      const normClause = normalizeArticleQuery(article.split(" ")[0]);
      const keywords = kwRaw
        ? kwRaw.split(",").map(function(s) { return s.trim(); }).filter(Boolean)
        : [normClause, type];

      const newOrder = appState.agendas.length + 1;
      const voter = getCurrentVoter();
      const newAg = {
        id: "ag-" + newOrder,
        orderNo: newOrder,
        codeName: "단칙 개정안 " + newOrder,
        proposer: voter.name + " 단원",
        type: type,
        targetArticle: article,
        relatedClauses: [normClause],
        title: title,
        beforeText: beforeText,
        afterText: afterText,
        reason: reason,
        keywords: keywords,
        status: "active",
        voterTotal: appState.totalAttendees,
        passThreshold: getMajorityThreshold(appState.totalAttendees),
        baseApprove: 0,
        baseReject: 0,
        baseAbstain: 0,
        memberVotes: {}
      };

      appState.agendas.push(newAg);
      appState.activeAgendaId = newAg.id;
      closeAddAgendaModal();
      saveStateToStorage();
      renderAll();
      showToast("신규 단칙 개정안이 등록되었습니다.");
    }

    function openAddEventModal() {
      document.getElementById("editEventId").value = "";
      document.getElementById("newEventDate").value = "";
      document.getElementById("newEventCategory").value = "";
      document.getElementById("newEventTitle").value = "";
      document.getElementById("newEventCount").value = "";
      document.getElementById("newEventBudget").value = "";
      document.getElementById("newEventSummary").value = "";
      const titleEl = document.getElementById("eventModalTitleText");
      if (titleEl) titleEl.textContent = "연간 일정 및 행사 내역 추가";
      const m = document.getElementById("addEventModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function openEditEventModal(eventId) {
      const ev = appState.events.find(function(x) { return x.id === eventId; });
      if (!ev) return;
      document.getElementById("editEventId").value = ev.id;
      document.getElementById("newEventDate").value = ev.date || "";
      document.getElementById("newEventCategory").value = ev.category || "";
      document.getElementById("newEventTitle").value = ev.title || "";
      document.getElementById("newEventCount").value = ev.participantsCount || 35;
      document.getElementById("newEventBudget").value = ev.budgetNote || "";
      document.getElementById("newEventSummary").value = ev.summary || "";
      const titleEl = document.getElementById("eventModalTitleText");
      if (titleEl) titleEl.textContent = "행사 내역 수정";
      const m = document.getElementById("addEventModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function deleteEventItem(eventId) {
      appState.events = appState.events.filter(function(x) { return x.id !== eventId; });
      saveStateToStorage();
      renderAll();
      showToast("선택한 행사 내역이 삭제되었습니다.");
    }

    function closeAddEventModal() {
      const m = document.getElementById("addEventModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function submitNewEvent() {
      const editId = document.getElementById("editEventId").value;
      const date = (document.getElementById("newEventDate").value || "").trim() || "2026. 12. 05";
      const category = (document.getElementById("newEventCategory").value || "").trim() || "특별행사";
      const title = (document.getElementById("newEventTitle").value || "").trim();
      const count = parseInt(document.getElementById("newEventCount").value, 10) || 35;
      const budget = (document.getElementById("newEventBudget").value || "").trim() || "결산 내역 확인중";
      const summary = (document.getElementById("newEventSummary").value || "").trim() || "메리고잉 운영진 주관 행사";

      if (!title) {
        showToast("행사명을 입력해 주세요.");
        return;
      }

      if (editId) {
        const ev = appState.events.find(function(x) { return x.id === editId; });
        if (ev) {
          ev.date = date;
          ev.category = category;
          ev.title = title;
          ev.participantsCount = count;
          ev.budgetNote = budget;
          ev.summary = summary;
        }
        showToast("행사 내역이 수정되었습니다.");
      } else {
        appState.events.push({
          id: "ev-" + Date.now(),
          date: date,
          category: category,
          title: title,
          participantsCount: count,
          budgetNote: budget,
          summary: summary
        });
        showToast("새 행사 내역이 추가되었습니다.");
      }

      closeAddEventModal();
      saveStateToStorage();
      renderAll();
    }

    function openScheduleModal(schedId) {
      const item = schedId ? (appState.assemblySchedule || []).find(function(x) { return x.id === schedId; }) : null;
      document.getElementById("editScheduleId").value = item ? item.id : "";
      document.getElementById("schedInputTitle").value = item ? item.title : "";
      document.getElementById("schedInputDesc").value = item ? item.desc : "";
      document.getElementById("schedInputStatus").value = item ? (item.status || "진행중") : "진행중";
      document.getElementById("schedInputTargetTab").value = item ? (item.targetTab || "") : "";
      const m = document.getElementById("scheduleModal");
      m.classList.remove("hidden");
      m.classList.add("flex");
    }

    function closeScheduleModal() {
      const m = document.getElementById("scheduleModal");
      m.classList.add("hidden");
      m.classList.remove("flex");
    }

    function saveScheduleItem() {
      const editId = document.getElementById("editScheduleId").value;
      const title = (document.getElementById("schedInputTitle").value || "").trim();
      const desc = (document.getElementById("schedInputDesc").value || "").trim();
      const status = document.getElementById("schedInputStatus").value || "진행중";
      const targetTab = document.getElementById("schedInputTargetTab").value || "";

      if (!title) {
        showToast("식순 제목을 입력해 주세요.");
        return;
      }

      const labelMap = {
        "": "",
        "sectionConcertReview": "요약보기 ↓",
        "settlement": "결산탭 →",
        "voting": "투표탭 →",
        "election": "단장선거 →",
        "bylaws": "단칙보기 →",
        "winner": "당선공고 →"
      };

      if (!Array.isArray(appState.assemblySchedule)) appState.assemblySchedule = [];

      if (editId) {
        const item = appState.assemblySchedule.find(function(x) { return x.id === editId; });
        if (item) {
          item.title = title;
          item.desc = desc;
          item.status = status;
          item.targetTab = targetTab;
          item.btnLabel = labelMap[targetTab] || "바로가기 →";
        }
        showToast("정기총회 식순 항목이 수정되었습니다.");
      } else {
        appState.assemblySchedule.push({
          id: "sch-" + Date.now(),
          title: title,
          desc: desc,
          status: status,
          targetTab: targetTab,
          btnLabel: labelMap[targetTab] || "바로가기 →"
        });
        showToast("정기총회 식순 항목이 추가되었습니다.");
      }

      closeScheduleModal();
      saveStateToStorage();
      renderAll();
    }

    function deleteScheduleItem(schedId) {
      appState.assemblySchedule = (appState.assemblySchedule || []).filter(function(x) { return x.id !== schedId; });
      saveStateToStorage();
      renderAll();
      showToast("선택한 식순 항목이 삭제되었습니다.");
    }

    function toggleProjectorMode() {
      appState.projectorMode = !appState.projectorMode;
      const mainEl = document.getElementById("mainAppContainer");
      const labelEl = document.getElementById("projectorToggleLabel");
      if (appState.projectorMode) {
        mainEl.classList.add("projector-mode");
        labelEl.textContent = "단상 스크린 확대모드 ON";
        showToast("단상 프로젝터 스크린용 글자 확대 모드가 켜졌습니다.");
      } else {
        mainEl.classList.remove("projector-mode");
        labelEl.textContent = "단상 스크린 확대모드 OFF";
        showToast("일반 글자 크기로 전환되었습니다.");
      }
    }

    function exportAssemblyResultsCSV() {
      const rows = [
        ["안건번호", "발의자", "대상조항", "안건제목", "투표인원", "2/3가결기준", "찬성", "반대", "기권", "의결결과"]
      ];
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        rows.push([
          ag.codeName || ("제" + ag.orderNo + "호"),
          ag.proposer || "-",
          ag.targetArticle,
          '"' + ag.title.replace(/"/g, '""') + '"',
          t.totalAttendees,
          t.majorityThreshold,
          t.approve,
          t.reject,
          t.abstain,
          t.isAdopted ? "가결" : "부결"
        ]);
      });
      const csvContent = "\uFEFF" + rows.map(function(r) { return r.join(","); }).join("\n");
      triggerDownloadBlob(csvContent, "2026_삼성한우리합창단_단칙개정안_투표결과.csv", "text/csv;charset=utf-8;");
      showToast("총회 의결 결과 CSV 파일 다운로드가 시작되었습니다.");
    }

    function copyShareLink() {
      const currentUrl = window.location && window.location.href && window.location.href.indexOf("http") === 0
        ? window.location.href
        : "https://hanuri-choir.github.io/assembly-2026/";
      const shareText = "[2026 삼성한우리합창단 정기총회 with ‘메리고잉 운영진’]\n단칙 검색·개정안 투표·단장 선거 접속 링크: " + currentUrl;
      copyTextToClipboard(shareText, "총회 단원 접속용 공유 링크가 클립보드에 복사되었습니다!");
    }

    function copyMinutesSummaryText() {
      let lines = [
        "■ 2026 삼성한우리합창단 정기총회 단칙 개정안 투표 결과 요약",
        "- 성원 보고: 재적 정단원 164명 중 현장참석 39명 + 쉐도우보팅 94명 = 총 127명 (정족수 110명 충족)",
        ""
      ];
      appState.agendas.forEach(function(ag) {
        const t = getAgendaTallies(ag);
        lines.push(
          "• " + (ag.codeName || ("제" + ag.orderNo + "호")) + " [" + ag.targetArticle + " · 발의: " + (ag.proposer || "-") + "] " +
          "→ 찬성 " + t.approve + "(" + t.majorityThreshold + ") / 반대 " + t.reject + " / 기권 " + t.abstain + " (" +
          (t.isAdopted ? "가결" : "부결") + ")"
        );
      });
      copyTextToClipboard(lines.join("\n"), "총회 회의록 요약 텍스트가 클립보드에 복사되었습니다!");
    }
