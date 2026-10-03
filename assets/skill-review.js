(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const refs = {
    nav: $("account-skill-review-nav"), count: $("account-skill-review-count"),
    list: $("skill-review-list"), listTitle: $("skill-review-list-title"), listSummary: $("skill-review-list-summary"),
    detail: $("skill-review-detail"), refresh: $("skill-review-refresh"), filters: document.querySelectorAll("[data-skill-review-filter]"),
    approveDialog: $("skill-review-approve-dialog"), approveName: $("skill-review-approve-name"),
    approveError: $("skill-review-approve-error"), approveConfirm: $("skill-review-approve-confirm"),
    rejectDialog: $("skill-review-reject-dialog"), rejectForm: $("skill-review-reject-form"),
    rejectSubtitle: $("skill-review-reject-subtitle"), rejectReason: $("skill-review-reject-reason"), rejectError: $("skill-review-reject-error"),
  };
  if (!refs.nav || !refs.list || !refs.detail) return;

  const state = { account: "demo.user", isAdmin: false, filter: "pending", items: [], selectedId: "", detail: null, selectedFile: "", approval: null, approving: false };
  const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const refreshIcons = () => window.lucide?.createIcons({ attrs: { width: 16, height: 16, "aria-hidden": "true" } });
  const formatDate = (value) => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).replaceAll("/", "-");
  };
  const statusMeta = (status) => ({
    reviewing: ["待审核", "reviewing"], approved: ["已通过", "approved"], rejected: ["已驳回", "rejected"],
  }[status] || [status || "-", ""]);

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", "X-AIDW-Account": state.account, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.detail || `请求失败 (${response.status})`);
    return body;
  }

  function toast(message) {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("is-visible"), 2400);
  }

  function lineDiff(previousContent, currentContent) {
    const previous = String(previousContent || "").split("\n");
    const current = String(currentContent || "").split("\n");
    if (previous.join("\n") === current.join("\n")) return [];
    let prefixLength = 0;
    while (prefixLength < previous.length && prefixLength < current.length && previous[prefixLength] === current[prefixLength]) prefixLength += 1;
    let suffixLength = 0;
    while (suffixLength < previous.length - prefixLength && suffixLength < current.length - prefixLength && previous[previous.length - suffixLength - 1] === current[current.length - suffixLength - 1]) suffixLength += 1;
    const previousMiddle = previous.slice(prefixLength, previous.length - suffixLength);
    const currentMiddle = current.slice(prefixLength, current.length - suffixLength);
    const prefix = previous.slice(0, prefixLength).map((text) => ({ type: "same", text }));
    const suffix = suffixLength ? previous.slice(previous.length - suffixLength).map((text) => ({ type: "same", text })) : [];
    if (!previousMiddle.length) return [...prefix, ...currentMiddle.map((text) => ({ type: "add", text })), ...suffix];
    if (!currentMiddle.length) return [...prefix, ...previousMiddle.map((text) => ({ type: "remove", text })), ...suffix];
    if (previousMiddle.length * currentMiddle.length > 1000000) return [...prefix, ...previousMiddle.map((text) => ({ type: "remove", text })), ...currentMiddle.map((text) => ({ type: "add", text })), ...suffix];
    const matrix = Array.from({ length: previousMiddle.length + 1 }, () => new Uint32Array(currentMiddle.length + 1));
    for (let left = previousMiddle.length - 1; left >= 0; left -= 1) {
      for (let right = currentMiddle.length - 1; right >= 0; right -= 1) matrix[left][right] = previousMiddle[left] === currentMiddle[right] ? matrix[left + 1][right + 1] + 1 : Math.max(matrix[left + 1][right], matrix[left][right + 1]);
    }
    const diff = [...prefix];
    let left = 0; let right = 0;
    while (left < previousMiddle.length && right < currentMiddle.length) {
      if (previousMiddle[left] === currentMiddle[right]) { diff.push({ type: "same", text: previousMiddle[left] }); left += 1; right += 1; }
      else if (matrix[left + 1][right] >= matrix[left][right + 1]) diff.push({ type: "remove", text: previousMiddle[left++] });
      else diff.push({ type: "add", text: currentMiddle[right++] });
    }
    while (left < previousMiddle.length) diff.push({ type: "remove", text: previousMiddle[left++] });
    while (right < currentMiddle.length) diff.push({ type: "add", text: currentMiddle[right++] });
    return [...diff, ...suffix];
  }

  function compactDiff(lines, context = 3) {
    if (!lines.length) return [];
    const changed = lines.map((line, index) => line.type === "add" || line.type === "remove" ? index : -1).filter((index) => index >= 0);
    if (!changed.length) return lines;
    const visible = new Set();
    changed.forEach((index) => {
      for (let offset = Math.max(0, index - context); offset <= Math.min(lines.length - 1, index + context); offset += 1) visible.add(offset);
    });
    const output = []; let previousIndex = -2;
    [...visible].sort((a, b) => a - b).forEach((index) => {
      if (index > previousIndex + 1) output.push({ type: "gap", text: "未变更内容已折叠" });
      output.push(lines[index]); previousIndex = index;
    });
    return output;
  }

  function fileChanges(detail) {
    const current = new Map((detail.files || []).map((file) => [file.path, file]));
    const previous = new Map((detail.previous_files || []).map((file) => [file.path, file]));
    return (detail.changes || []).map((change) => {
      const diff = lineDiff(previous.get(change.path)?.content || "", current.get(change.path)?.content || "");
      return { ...change, diff, additions: diff.filter((line) => line.type === "add").length, deletions: diff.filter((line) => line.type === "remove").length };
    });
  }

  function diffHtml(lines) {
    const compact = compactDiff(lines);
    if (!compact.length) return '<div class="skill-review-empty"><strong>文件内容没有变化</strong></div>';
    return `<div class="skill-review-diff">${compact.map((line) => `<div class="skill-review-diff-line is-${line.type}"><span>${line.type === "add" ? "+" : line.type === "remove" ? "-" : line.type === "gap" ? "…" : ""}</span><span>${escapeHtml(line.text || " ")}</span></div>`).join("")}</div>`;
  }

  function renderList() {
    refs.listTitle.textContent = state.filter === "pending" ? "待审核" : "已处理";
    refs.listSummary.textContent = `${state.items.length} 条`;
    refs.list.innerHTML = state.items.length ? state.items.map((item) => {
      const [label, className] = statusMeta(item.review_status);
      return `<button class="skill-review-list-item ${item.revision_id === state.selectedId ? "is-active" : ""}" type="button" data-skill-review-id="${escapeHtml(item.revision_id)}"><span><strong>${escapeHtml(item.skill_title)}</strong><em class="skill-review-status ${className}">${label}</em></span><small><span>${escapeHtml(item.version)} · ${escapeHtml(item.actor || "-")}</span><span>${Number(item.file_count || 0)} 个文件</span></small><small><span>${escapeHtml(item.notes || "未填写发布说明")}</span><time>${escapeHtml(formatDate(item.created_at))}</time></small></button>`;
    }).join("") : `<div class="skill-review-empty"><i data-lucide="${state.filter === "pending" ? "inbox" : "history"}"></i><strong>${state.filter === "pending" ? "暂无待审核申请" : "暂无已处理记录"}</strong></div>`;
    refs.list.querySelectorAll("[data-skill-review-id]").forEach((button) => button.addEventListener("click", () => selectReview(button.dataset.skillReviewId)));
    refreshIcons();
  }

  function renderDetail() {
    const detail = state.detail;
    if (!detail) {
      refs.detail.innerHTML = '<div class="skill-review-empty"><i data-lucide="file-check-2"></i><strong>选择一条申请查看变更</strong></div>';
      refreshIcons(); return;
    }
    const changes = fileChanges(detail);
    const additions = changes.reduce((total, file) => total + file.additions, 0);
    const deletions = changes.reduce((total, file) => total + file.deletions, 0);
    const selected = changes.find((file) => file.path === state.selectedFile) || changes[0];
    state.selectedFile = selected?.path || "";
    const [statusLabel, statusClass] = statusMeta(detail.review_status);
    const actions = detail.review_status === "reviewing" ? `<div class="skill-review-actions"><button class="reject" type="button" data-skill-review-reject>${icon("x-circle")}<span>驳回</span></button><button class="approve" type="button" data-skill-review-approve>${icon("check-circle-2")}<span>通过</span></button></div>` : "";
    const decision = detail.review_status === "rejected" ? `<section class="skill-review-decision rejected"><strong>驳回原因</strong><p>${escapeHtml(detail.review_reason || "未填写")}</p></section>` : detail.review_status === "approved" ? `<section class="skill-review-decision"><strong>审核结果</strong><p>${escapeHtml(detail.reviewed_by || "-")} 于 ${escapeHtml(formatDate(detail.reviewed_at))} 审核通过</p></section>` : "";
    const metadata = (detail.metadata_changes || []).length ? `<section class="skill-review-notes"><strong>基本信息变更</strong><p>${detail.metadata_changes.map((change) => `${escapeHtml(change.label)}：${escapeHtml(change.previous || "空")} → ${escapeHtml(change.current || "空")}`).join("<br>")}</p></section>` : "";
    refs.detail.innerHTML = `<header class="skill-review-detail-head"><div class="skill-review-detail-title"><span><h2>${escapeHtml(detail.skill_title)} · ${escapeHtml(detail.version)}</h2><em class="skill-review-status ${statusClass}">${statusLabel}</em></span><p>${escapeHtml(detail.skill_name)}</p></div>${actions}</header><div class="skill-review-meta"><span>提交人：${escapeHtml(detail.actor || "-")}</span><span>审核人：${escapeHtml(detail.reviewer || "-")}</span><span>工作空间：${escapeHtml(detail.workspace_id || "-")}</span><span>提交时间：${escapeHtml(formatDate(detail.created_at))}</span><span>基于版本：${escapeHtml(detail.previous_version || "首次发布")}</span><span>${Number(detail.file_count || 0)} 个文件</span></div><section class="skill-review-notes"><strong>发布说明</strong><p>${escapeHtml(detail.notes || "未填写发布说明")}</p></section>${decision}${metadata}<section class="skill-review-summary"><strong>文件变更</strong><span>${changes.length} 个文件</span><b class="is-add">+${additions}</b><b class="is-remove">-${deletions}</b></section><div class="skill-review-files">${changes.map((file) => `<button class="skill-review-file ${file.path === selected?.path ? "is-active" : ""}" type="button" data-skill-review-file="${escapeHtml(file.path)}"><span>${icon(file.change === "added" ? "file-plus-2" : file.change === "deleted" ? "file-minus-2" : "file-pen-line")}<strong>${escapeHtml(file.path)}</strong><small>${escapeHtml(file.label)}</small></span><span><b class="is-add">+${file.additions}</b><b class="is-remove">-${file.deletions}</b></span></button>`).join("") || '<div class="skill-review-empty"><strong>没有文件内容变更</strong></div>'}</div>${selected ? diffHtml(selected.diff) : ""}`;
    refs.detail.querySelectorAll("[data-skill-review-file]").forEach((button) => button.addEventListener("click", () => { state.selectedFile = button.dataset.skillReviewFile; renderDetail(); }));
    refs.detail.querySelector("[data-skill-review-approve]")?.addEventListener("click", openApproveDialog);
    refs.detail.querySelector("[data-skill-review-reject]")?.addEventListener("click", openRejectDialog);
    refreshIcons();
  }

  async function selectReview(id) {
    state.selectedId = id; state.selectedFile = ""; renderList();
    refs.detail.innerHTML = '<div class="skill-review-empty"><strong>正在读取变更...</strong></div>';
    try { state.detail = await api(`/api/admin/skill-reviews/${encodeURIComponent(id)}`); renderDetail(); }
    catch (error) { state.detail = null; refs.detail.innerHTML = `<div class="skill-review-empty"><strong>${escapeHtml(error.message)}</strong></div>`; }
  }

  async function refreshCount() {
    if (!state.isAdmin) { refs.count.hidden = true; return; }
    try {
      const result = await api("/api/admin/skill-reviews?status=reviewing");
      const count = Number(result.total || result.items?.length || 0);
      refs.count.textContent = count > 99 ? "99+" : String(count);
      refs.count.hidden = count === 0;
    } catch (_error) { refs.count.hidden = true; }
  }

  function setFilter(filter) {
    state.filter = filter === "processed" ? "processed" : "pending";
    refs.filters.forEach((item) => item.classList.toggle("is-active", item.dataset.skillReviewFilter === state.filter));
  }

  async function load() {
    if (!state.isAdmin) return;
    refs.list.innerHTML = '<div class="skill-review-empty"><strong>正在加载审核申请...</strong></div>';
    try {
      const status = state.filter === "pending" ? "reviewing" : "processed";
      const result = await api(`/api/admin/skill-reviews?status=${status}`);
      state.items = result.items || [];
      if (!state.items.some((item) => item.revision_id === state.selectedId)) state.selectedId = state.items[0]?.revision_id || "";
      renderList();
      if (state.selectedId) await selectReview(state.selectedId); else { state.detail = null; renderDetail(); }
      await refreshCount();
    } catch (error) { state.items = []; refs.list.innerHTML = `<div class="skill-review-empty"><strong>${escapeHtml(error.message)}</strong></div>`; state.detail = null; renderDetail(); }
  }

  function closeApproveDialog() {
    if (state.approving) return;
    refs.approveDialog.close(); state.approval = null;
  }

  function openApproveDialog() {
    if (!state.detail) return;
    state.approval = { revisionId: state.detail.revision_id, skillId: state.detail.skill_id };
    refs.approveName.textContent = `${state.detail.skill_title} · ${state.detail.version}`;
    refs.approveError.hidden = true; refs.approveError.textContent = "";
    refs.approveDialog.showModal(); refs.approveConfirm.focus();
  }

  async function approveReview() {
    if (!state.approval || state.approving) return;
    const approval = state.approval;
    state.approving = true; refs.approveConfirm.disabled = true; refs.approveConfirm.textContent = "正在通过...";
    try {
      await api(`/api/admin/skill-reviews/${encodeURIComponent(approval.revisionId)}/approve`, { method: "POST", body: "{}" });
      refs.approveDialog.close(); state.approval = null;
      toast("审核已通过，Skill 版本已发布");
      document.dispatchEvent(new CustomEvent("aidw:skill-review-updated", { detail: { skillId: approval.skillId, status: "approved" } }));
      setFilter("processed"); state.selectedId = approval.revisionId; state.detail = null; await load();
    } catch (error) { refs.approveError.textContent = error.message; refs.approveError.hidden = false; }
    finally { state.approving = false; refs.approveConfirm.disabled = false; refs.approveConfirm.textContent = "确认通过"; }
  }

  function openRejectDialog() {
    if (!state.detail) return;
    refs.rejectSubtitle.textContent = `${state.detail.skill_title} · ${state.detail.version}`;
    refs.rejectReason.value = ""; refs.rejectError.hidden = true; refs.rejectDialog.showModal(); refs.rejectReason.focus();
  }

  async function rejectReview(event) {
    event.preventDefault();
    const reason = refs.rejectReason.value.trim();
    if (!reason) { refs.rejectError.textContent = "请填写驳回原因"; refs.rejectError.hidden = false; return; }
    try {
      await api(`/api/admin/skill-reviews/${encodeURIComponent(state.detail.revision_id)}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      refs.rejectDialog.close(); toast("发布申请已驳回");
      document.dispatchEvent(new CustomEvent("aidw:skill-review-updated", { detail: { skillId: state.detail.skill_id, status: "rejected" } }));
      const revisionId = state.detail.revision_id;
      setFilter("processed"); state.selectedId = revisionId; state.detail = null; await load();
    } catch (error) { refs.rejectError.textContent = error.message; refs.rejectError.hidden = false; }
  }

  refs.filters.forEach((button) => button.addEventListener("click", () => {
    setFilter(button.dataset.skillReviewFilter);
    state.selectedId = ""; state.detail = null; load();
  }));
  refs.refresh.addEventListener("click", load);
  refs.approveConfirm.addEventListener("click", approveReview);
  $("skill-review-approve-close").addEventListener("click", closeApproveDialog);
  $("skill-review-approve-cancel").addEventListener("click", closeApproveDialog);
  refs.rejectForm.addEventListener("submit", rejectReview);
  $("skill-review-reject-close").addEventListener("click", () => refs.rejectDialog.close());
  $("skill-review-reject-cancel").addEventListener("click", () => refs.rejectDialog.close());

  window.AIDWSkillReview = {
    setAccount(account, isAdmin) { state.account = account || "demo.user"; state.isAdmin = Boolean(isAdmin); refs.nav.hidden = !state.isAdmin; refreshCount(); },
    load,
    refreshCount,
    async open(revisionId) {
      const id = revisionId || "";
      if (!id) { state.selectedId = ""; await load(); return; }
      try {
        const detail = await api(`/api/admin/skill-reviews/${encodeURIComponent(id)}`);
        setFilter(detail.review_status === "reviewing" ? "pending" : "processed");
        state.selectedId = id;
        await load();
      } catch (error) {
        state.selectedId = id; state.detail = null;
        refs.detail.innerHTML = `<div class="skill-review-empty"><strong>${escapeHtml(error.message)}</strong></div>`;
      }
    },
  };
})();
