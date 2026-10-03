(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const enabled = window.location.hostname.endsWith(".pages.dev")
    || window.location.hostname.endsWith(".github.io")
    || params.get("mock") === "1";
  if (!enabled) return;

  const platformVersion = "v1.0.0";
  const STORAGE_KEY = "aidw.pages.mock.v100-single";
  const nativeFetch = window.fetch.bind(window);
  const knowledgeReference = window.AIDW_KNOWLEDGE_REFERENCE || null;
  const mockVersion = platformVersion;
  const now = () => new Date().toISOString();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const contentHash = (content) => {
    let hash = 2166136261;
    for (const character of String(content || "")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `mock-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  };
  const roleLabels = {
    admin: "管理员",
    data_product_manager: "数据产品经理",
    dw_engineer: "数仓工程师",
  };
  const roleModules = [
    { id: "chat", label: "对话" },
    { id: "requirements", label: "需求" },
    { id: "knowledge", label: "知识库" },
    { id: "skills", label: "Skills" },
    { id: "agents", label: "Agents" },
    { id: "spaces", label: "空间" },
    { id: "users", label: "用户" },
    { id: "roles", label: "角色" },
    { id: "notifications", label: "通知" },
    { id: "skill-reviews", label: "审核" },
    { id: "auth", label: "认证" },
  ];
  const builtinRoles = [
    { id: "admin", name: "管理员", description: "拥有全部管理和业务模块权限", module_ids: roleModules.map((item) => item.id), module_count: roleModules.length, is_builtin: true, created_at: "2026-07-24T00:00:00.000Z" },
    { id: "data_product_manager", name: "数据产品经理", description: "负责需求、知识和业务协作", module_ids: ["chat", "requirements", "knowledge", "skills", "agents"], module_count: 5, is_builtin: true, created_at: "2026-07-24T00:00:00.000Z" },
    { id: "dw_engineer", name: "数仓工程师", description: "负责数仓研发流程和数据资产维护", module_ids: ["chat", "requirements", "knowledge", "skills", "agents"], module_count: 5, is_builtin: true, created_at: "2026-07-24T00:00:00.000Z" },
  ];

  const stageFiles = [
    ["01_requirement_review_report.md", "需求评审报告", "# 需求评审报告\n\n## 目标\n\n统一活跃用户指标口径，并补充渠道与版本维度。\n\n## 验收标准\n\n- 按日输出活跃用户数。\n- 支持渠道、平台和版本筛选。\n- 与现有日报核心口径偏差小于 0.5%。"],
    ["02_warehouse_research_report.md", "数仓调研报告", "# 数仓调研报告\n\n已定位登录明细、用户维度和现有日报汇总表。生产链路完整，分区字段均为 `ds`。"],
    ["03_model_design_report.md", "模型设计报告", "# 模型设计报告\n\n采用 DWS 日汇总模型，粒度为 `ds + virtual_appid + channel_id + platform + version`。"],
    ["04_data_development_report.md", "数仓开发结果", "# 数据开发结果\n\n```sql\nINSERT OVERWRITE TABLE dm_demo.dws_demo_active_user_1d PARTITION (ds='${bizdate}')\nSELECT virtual_appid, channel_id, platform, version, COUNT(DISTINCT user_id) AS active_user_cnt\nFROM dw_demo.dwd_demo_user_login_detail_di\nWHERE ds='${bizdate}'\nGROUP BY virtual_appid, channel_id, platform, version;\n```"],
    ["05_data_validation_report.md", "数据验证结果", "# 数据验证结果\n\n| 校验项 | 结果 |\n|---|---|\n| 主键唯一性 | 通过 |\n| 空值检查 | 通过 |\n| 核心口径对账 | 偏差 0.12% |\n\n所有验收项均已通过。"],
    ["06_solution_review_report.md", "方案审查报告", "# 方案审查报告\n\n- 需求一致性：通过\n- 模型一致性：通过\n- 数据开发规范：通过\n- 验证覆盖：通过\n- 上线风险：低\n\n审查结论：方案完整，可以进入最终确认。"],
  ];
  const S01_INPUT = "帮我做下这个需求https://example.invalid/requirements/active-users";
  const S01_DEMO_REQUIREMENT_ID = "REQ-20260820-S01";
  const S01_MISSING_MATERIALS = [
    "确认 B 报表实际绑定的物理表",
    "补充目标自助分析的字段清单",
    "确认回溯截止日期",
  ];
  const fixedDemoStageFiles = [
    ["01_requirement_review_report.md", "需求评审报告", "# 需求评审报告\n\n> 当前环境未连接外部数据源，评审基于需求文档与本地构造数据完成。\n\n- 游戏：Demo\n- 报表：示例转化报表；范围为该路径下全部自助分析\n- 指标：沿用报表现有指标，指标口径不变\n- 维度：新增等级标签 `level_tag`\n- 粒度：`ds`、`appid`、`level_id`、`level_tag`\n- 时间：日更新；回溯 2026-07-01 至上线前一天；时区 Asia/Shanghai\n- 验收条件：不限制等级标签时改造前后现有指标汇总值和用户数一致；`level_tag` 空值率小于 1%；回溯日期分区连续；输出记录数、增幅和查询耗时对比\n\n## 评审结论\n\n- 结论：需求评审通过。\n- 来源表：`dwd_demo.dwd_level_play_di`\n- 目标表：`ads_demo.ads_super_bird_report_di`\n- 安全边界：只生成本地流程产物，不连接、不查询、不修改真实数仓。"],
    ["02_warehouse_research_report.md", "数仓调研报告", "# 数仓调研报告\n\n- 调研范围：示例游戏（Demo）数仓。\n- 来源口径：`dwd_demo.dwd_level_play_di.level_tag`。\n- 目标报表：示例转化报表下全部自助分析。\n- 目标表：`ads_demo.ads_super_bird_report_di`。\n- 生产链路：`dwd_demo.dwd_level_play_di` -> `ads_demo.ads_super_bird_report_di` -> 示例转化报表。\n- 调度依赖：来源表对应 `ds` 分区完成后，每日 06:00 产出。\n\n结论：来源字段、目标表和生产链路已固定，可进入模型设计。"],
    ["03_model_design_report.md", "模型设计报告", "# 模型设计报告\n\n## 字段变更\n\n```sql\nALTER TABLE ads_demo.ads_super_bird_report_di\nADD COLUMNS (level_tag STRING COMMENT '等级标签');\n```\n\n## 设计结论\n\n- 聚合粒度：`ds`、`appid`、`level_id`、`level_tag`。\n- 字段映射：`source.level_tag` -> `target.level_tag`，空值回填 `UNKNOWN`。\n- 现有指标口径保持不变。\n- 回溯范围：2026-07-01 至上线前一天。\n\n结论：模型变更范围已固定，可进入数据开发。"],
    ["04_data_development_report.md", "数仓开发结果", "# 数据开发结果\n\n```sql\nINSERT OVERWRITE TABLE ads_demo.ads_super_bird_report_di\nPARTITION (ds='${bizdate}', appid)\nSELECT\n  level_id,\n  COALESCE(level_tag, 'UNKNOWN') AS level_tag,\n  COUNT(DISTINCT uid) AS user_count,\n  SUM(metric_value) AS metric_value,\n  appid\nFROM dwd_demo.dwd_level_play_di\nWHERE ds='${bizdate}'\nGROUP BY level_id, COALESCE(level_tag, 'UNKNOWN'), appid;\n```\n\n- 调度：每日 06:00。\n- 依赖：`dwd_demo.dwd_level_play_di` 当日分区。\n- 回溯：2026-07-01 至上线前一天，按天补跑。\n\n结论：固定 ETL 已生成，可进入数据验证。"],
    ["05_data_validation_report.md", "数据验证结果", "# 数据验证结果\n\n- 验证模式：只生成 SQL，不连接或修改真实数仓。\n- 规则 V001：改造前后现有指标汇总值一致。\n- 规则 V002：改造前后用户数一致。\n- 规则 V003：等级标签空值率小于 1%。\n- 规则 V004：2026-07-01 至上线前一天每日分区连续。\n- 规则 V005：输出改造前后记录数、增幅和查询耗时对比。\n\n结论：五类验证 SQL 已生成，等待接入真实表后执行。"],
    ["06_solution_review_report.md", "方案审查报告", "# 方案审查报告\n\n- 审查范围：需求评审、数仓调研、模型设计、数据开发和数据验证全链路。\n- 需求一致性：实现范围与原始需求一致。\n- 模型一致性：字段、粒度、分区和回溯策略与模型设计一致。\n- 验证覆盖：口径、质量、完整性和性能要求均已有验证规则。\n- 上线风险：当前仅生成方案和 SQL，接入真实环境前需完成执行验证。\n\n审查结论：方案完整，可以进入最终确认。"],
  ];
  const workflowStages = [
    { id: "requirement_review", label: "需求评审", reason: "请确认需求评审报告后继续" },
    { id: "warehouse_research", label: "数仓调研", reason: "请确认数仓调研报告后继续" },
    { id: "model_design", label: "模型设计", reason: "请确认模型设计报告后继续" },
    { id: "data_development", label: "数据开发", reason: "请确认数据开发结果后继续" },
    { id: "data_validation", label: "数据验证", reason: "请确认数据验证结果后继续" },
    { id: "solution_review", label: "方案审查", reason: "请确认方案审查报告并完成流程" },
  ];

  const scenarioDefinitions = [
    ["S01", "完整数仓需求", S01_INPUT, "需求解析、数仓调研、模型设计、数据开发、数据验证、方案审查及阶段产物"],
  ];

  function demoConversations() {
    return scenarioDefinitions.map(([scenarioId, scenarioType, exampleInput, outputStructure], index) => {
      const timestamp = `2026-08-19T08:${String(index + 1).padStart(2, "0")}:00+08:00`;
      if (scenarioId === "S01") return fixedDemoReadyConversation(timestamp);
      return {
        id: `demo-${scenarioId.toLowerCase()}`, title: exampleInput, task_id: "", task_label: "",
        intent: "conversation", intent_label: scenarioType, requirement_id: "", review_gates: {},
        workspace_id: "demo", workflow_status: "", workflow_stage: "", workflow_stage_label: "",
        workflow_pause_reason: "", workflow_resume_stage: "", workflow_activity_log: [], workflow_events: [],
        generation_status: "completed", created_at: timestamp, updated_at: timestamp,
        is_demo: true, scenario_id: scenarioId, demo_order: index + 1,
        messages: [
          { id: `msg-${scenarioId.toLowerCase()}-user`, role: "user", content: exampleInput, created_at: timestamp, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
          { id: `msg-${scenarioId.toLowerCase()}-assistant`, role: "assistant", content: `预期输出结构：\n\n${outputStructure}`, created_at: timestamp, activities: [`已识别为${scenarioType}`], route: { intent: scenarioId === "S10" ? "conversation" : "quick_task", label: scenarioType, scenario_id: scenarioId }, reasoning_summary: "", artifacts: [] },
        ],
      };
    });
  }

  function fixedDemoReadyConversation(timestamp) {
    return {
      id: "demo-s01", title: S01_INPUT, task_id: "", task_label: "",
      intent: "", intent_label: "", requirement_id: "", review_gates: {}, workspace_id: "demo",
      workflow_status: "", workflow_stage: "", workflow_stage_label: "",
      workflow_pause_reason: "", workflow_resume_stage: "", workflow_activity_log: [], workflow_events: [],
      generation_status: "", pending_stage: null, created_at: timestamp, updated_at: timestamp,
      fixed_demo: true, is_demo: true, scenario_id: "S01", demo_order: 1, ready_to_start: true,
      messages: [
        { id: "msg-s01-user", role: "user", content: S01_INPUT, created_at: timestamp, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
      ],
    };
  }

  function fixedDemoPassedReviewGates() {
    const stages = {};
    workflowStages.forEach((stage, index) => {
      stages[stage.id] = {
        stage: stage.id, stage_label: stage.label, status: "passed", version: "V1.0",
        artifact_hash: `s01-${stage.id}`,
        reviewers: [{ username: "demo.user", status: "confirmed", confirmed_at: `2026-08-20T08:0${index + 2}:00+08:00` }],
      };
    });
    return { stages };
  }

  function fixedDemoAwaitingMaterialsReviewGates() {
    return { stages: {
      requirement_review: {
        stage: "requirement_review", stage_label: "需求评审", status: "passed", version: "V1.0",
        artifact_hash: "s01-requirement-review", missing_materials: [],
        reviewers: [{ username: "demo.user", status: "confirmed", confirmed_at: "2026-08-20T08:02:00+08:00" }],
      },
      warehouse_research: {
        stage: "warehouse_research", stage_label: "数仓调研", status: "awaiting_materials", version: "V1.0",
        artifact_hash: "s01-warehouse-research-draft",
        missing_materials: S01_MISSING_MATERIALS.map((label, index) => ({ id: `material-${index + 1}`, label, status: "pending" })),
        reviewers: [],
      },
    } };
  }

  function fixedDemoRequirementConfirmation({ confirmed = false, selectedValue = "max_level_type" } = {}) {
    return {
      id: "requirement-review-level-tag-source",
      stage: "requirement_review",
      status: confirmed ? "confirmed" : "pending",
      title: "选择等级标签口径",
      description: "该选择会影响维度定义、历史数据回溯和后续模型设计。",
      selected_value: selectedValue,
      options: [
        {
          value: "max_level_type",
          label: "max_level_type · 用户日最高等级标签",
          description: "适合用户日粒度分析，与现有标签链路一致。",
          recommended: true,
        },
        {
          value: "level_type_tag",
          label: "level_type_tag · 关卡事件等级标签",
          description: "适合关卡事件分析，但可能改变目标报表的聚合粒度。",
          recommended: false,
        },
      ],
    };
  }

  function fixedDemoConfirmationStageResult() {
    return {
      stage: "requirement_review", stage_label: "需求评审", state: "needs_confirmation", state_label: "需要确认",
      gate_label: "流程已暂停",
      objective: "确认需求范围、指标口径、回溯边界与验收标准。",
      summary: "需求范围和验收条件已完成结构化解析；等级标签存在两种可用口径，需要选择后才能形成最终评审结论。",
      execution: {
        label: "执行详情 · 已完成 2 项",
        duration_label: "耗时 00:46",
        items: [
          { label: "读取需求正文与 2 张配图", summary: "已从示例需求文件读取 1,843 字需求正文，并完成 2 张配图的文字与界面信息识别。正文包含改造背景、目标报表路径、字段说明和上线要求；两张配图分别用于确认报表入口与现有维度配置。链接、正文和图片均可正常解析，未发现失效引用或缺失附件。" },
          { label: "解析报表范围、维度和时间边界", summary: "已提取目标范围为示例转化报表路径下的全部自助分析，新增字段为 level_tag。识别到 max_level_type 与 level_type_tag 两个候选来源，需人工确认最终口径；历史数据从 2026-07-01 回溯至上线前一天，上线后按日更新。验收需覆盖汇总值与用户数一致性、标签空值率及分区连续性。" },
        ],
      },
      findings: [],
      next_step: "请选择等级标签口径；确认后系统将继续完成需求评审。",
    };
  }

  function fixedDemoNeedsConfirmationConversation(timestamp) {
    const pausedAtDate = new Date();
    const reviewStartedAt = new Date(pausedAtDate.getTime() - 46000).toISOString();
    const pausedAt = pausedAtDate.toISOString();
    const confirmation = fixedDemoRequirementConfirmation();
    const workflowEvents = [
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "started",
        message: "正在读取需求正文、表格和图片内容", completed_stages: [], recorded_at: reviewStartedAt,
      },
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "running",
        message: "需求范围和验收条件已完成结构化解析", completed_stages: [],
        activity_step: "parse", activity_status: "completed", recorded_at: pausedAt,
      },
      {
        type: "result", status: "paused", requirement_id: S01_DEMO_REQUIREMENT_ID,
        current_stage: "requirement_review", current_stage_label: "需求评审",
        reason: "等待确认等级标签口径", resume_stage: "requirement_review",
        completed_stages: [], recorded_at: pausedAt,
      },
    ];
    return {
      id: "demo-s01", title: S01_INPUT, task_id: "", task_label: "",
      intent: "requirement", intent_label: "数仓研发需求", requirement_id: S01_DEMO_REQUIREMENT_ID,
      review_gates: { stages: {} }, workspace_id: "demo",
      workflow_status: "paused", workflow_stage: "requirement_review", workflow_stage_label: "需求评审",
      workflow_pause_reason: "等待确认等级标签口径", workflow_resume_stage: "requirement_review",
      workflow_activity_log: [], workflow_events: workflowEvents,
      generation_status: "completed", created_at: timestamp, updated_at: pausedAt,
      fixed_demo: true, is_demo: true, scenario_id: "S01", demo_order: 1,
      messages: [
        { id: "msg-s01-user", role: "user", content: S01_INPUT, created_at: timestamp, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
        {
          id: "msg-s01-review-confirmation", role: "assistant", content: "", created_at: pausedAt, activities: [],
          route: workflowRoute(S01_DEMO_REQUIREMENT_ID, true, 0), reasoning_summary: "", artifacts: [],
          stage_result: fixedDemoConfirmationStageResult(), confirmation_request: confirmation,
        },
      ],
    };
  }

  function fixedDemoAwaitingRequirementReviewConversation(timestamp, requirementId, confirmationRequest) {
    const pausedAtDate = new Date();
    const reviewStartedAt = new Date(pausedAtDate.getTime() - 46000).toISOString();
    const reviewParsedAt = new Date(pausedAtDate.getTime() - 18000).toISOString();
    const pausedAt = pausedAtDate.toISOString();
    const reviewFile = stageFile(requirementId, 0, true);
    const reviewGate = {
      stage: "requirement_review", stage_label: "需求评审", status: "awaiting_confirmation", version: "V1.0",
      artifact_hash: `s01-requirement-review-${Date.now()}`, missing_materials: [],
      reviewers: [{ username: state.selectedAccount || "demo.user", status: "pending", confirmed_at: "" }],
    };
    const workflowEvents = [
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "started",
        message: "正在读取需求正文、表格和图片内容", completed_stages: [], recorded_at: reviewStartedAt,
      },
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "running",
        message: "需求范围和验收条件已完成结构化解析", completed_stages: [],
        activity_step: "parse", activity_status: "completed", recorded_at: reviewParsedAt,
      },
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "completed",
        message: "已按所选口径生成需求评审报告", requirement_id: requirementId,
        completed_stages: ["requirement_review"], activity_step: "result", activity_status: "completed",
        detail: fixedDemoStageDetail("requirement_review", requirementId), recorded_at: pausedAt,
      },
      {
        type: "result", status: "paused", requirement_id: requirementId,
        current_stage: "warehouse_research", current_stage_label: "数仓调研",
        reason: "请确认需求评审报告后继续", resume_stage: "warehouse_research",
        completed_stages: ["requirement_review"], recorded_at: pausedAt,
      },
    ];
    return {
      id: "demo-s01", title: S01_INPUT, task_id: "", task_label: "",
      intent: "requirement", intent_label: "数仓研发需求", requirement_id: requirementId,
      review_gates: { stages: { requirement_review: reviewGate } }, workspace_id: "demo",
      workflow_status: "paused", workflow_stage: "warehouse_research", workflow_stage_label: "数仓调研",
      workflow_pause_reason: "请确认需求评审报告后继续", workflow_resume_stage: "warehouse_research",
      workflow_activity_log: [], workflow_events: workflowEvents,
      generation_status: "completed", created_at: timestamp, updated_at: pausedAt,
      fixed_demo: true, is_demo: true, scenario_id: "S01", demo_order: 1,
      messages: [
        { id: "msg-s01-user", role: "user", content: S01_INPUT, created_at: timestamp, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
        {
          id: "msg-s01-review-choice", role: "assistant", content: "", created_at: reviewParsedAt, activities: [],
          route: workflowRoute(requirementId, true, 0), reasoning_summary: "", artifacts: [],
          stage_result: fixedDemoConfirmationStageResult(), confirmation_request: confirmationRequest,
        },
        {
          id: "msg-s01-review-report", role: "assistant", content: "", created_at: pausedAt,
          activities: fixedDemoActivities(0), route: workflowRoute(requirementId, true, 0), reasoning_summary: "",
          artifacts: [messageArtifact(reviewFile)], stage_result: fixedDemoStageResult(0),
        },
      ],
    };
  }

  function fixedDemoAwaitingMaterialsConversation(timestamp, requirementId = S01_DEMO_REQUIREMENT_ID, confirmationRequest = null) {
    const reviewGates = fixedDemoAwaitingMaterialsReviewGates();
    const pausedAt = new Date();
    const researchStartedAt = new Date(pausedAt.getTime() - 138000).toISOString();
    const reviewCompletedAt = new Date(pausedAt.getTime() - 186000).toISOString();
    const researchCheckedAt = new Date(pausedAt.getTime() - 36000).toISOString();
    const pausedAtIso = pausedAt.toISOString();
    const workflowEvents = [
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "completed",
        message: "需求评审已完成", completed_stages: ["requirement_review"],
        activity_step: "parse", activity_status: "completed", recorded_at: reviewCompletedAt,
      },
      {
        type: "progress", stage: "warehouse_research", stage_label: "数仓调研", status: "started",
        message: "正在检索候选事实表和现有指标口径", completed_stages: ["requirement_review"],
        recorded_at: researchStartedAt,
      },
      {
        type: "progress", stage: "warehouse_research", stage_label: "数仓调研", status: "running",
        message: "已完成现有表、指标口径和生产链路检索", completed_stages: ["requirement_review"],
        activity_step: "load", activity_status: "completed", recorded_at: researchCheckedAt,
      },
      {
        type: "result", status: "paused", requirement_id: requirementId,
        current_stage: "warehouse_research", current_stage_label: "数仓调研",
        reason: "数仓调研缺少必要材料", resume_stage: "warehouse_research",
        completed_stages: ["requirement_review"], recorded_at: pausedAtIso,
      },
    ];
    return {
      id: "demo-s01", title: S01_INPUT, task_id: "", task_label: "",
      intent: "requirement", intent_label: "数仓研发需求", requirement_id: requirementId,
      review_gates: reviewGates, workspace_id: "demo",
      workflow_status: "paused", workflow_stage: "warehouse_research", workflow_stage_label: "数仓调研",
      workflow_pause_reason: "数仓调研缺少必要材料", workflow_resume_stage: "warehouse_research",
      workflow_activity_log: [], workflow_events: workflowEvents,
      generation_status: "completed", created_at: timestamp, updated_at: pausedAtIso,
      fixed_demo: true, is_demo: true, scenario_id: "S01", demo_order: 1,
      messages: [
        { id: "msg-s01-user", role: "user", content: S01_INPUT, created_at: timestamp, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
        {
          id: "msg-s01-review", role: "assistant",
          content: "",
          created_at: reviewCompletedAt, activities: [],
          route: workflowRoute(requirementId, true, 0), reasoning_summary: "",
          artifacts: [messageArtifact(stageFile(requirementId, 0, true))],
          stage_result: fixedDemoStageResult(0),
          confirmation_request: confirmationRequest,
        },
        {
          id: "msg-s01-review-report-confirmed", role: "user",
          content: "确认「需求评审报告 V1.0」无误", created_at: pausedAtIso,
          activities: [], route: {}, reasoning_summary: "", artifacts: [],
        },
        {
          id: "msg-s01-research", role: "assistant",
          content: "", created_at: pausedAtIso, activities: [],
          route: workflowRoute(requirementId, true, 1), reasoning_summary: "", artifacts: [],
          stage_result: fixedDemoMissingMaterialStageResult(),
        },
      ],
    };
  }

  function fixedDemoCompletedConversation(timestamp) {
    const requirement = { id: S01_DEMO_REQUIREMENT_ID };
    const workflowEvents = [];
    const messages = [{
      id: "msg-s01-user", role: "user", content: S01_INPUT, created_at: timestamp,
      activities: [], route: {}, reasoning_summary: "", artifacts: [],
    }];
    workflowStages.forEach((stage, stageIndex) => {
      const recordedAt = `2026-08-20T08:0${stageIndex + 1}:00+08:00`;
      fixedDemoWorkflowEvents(requirement, stageIndex, { pause: false }).forEach((event) => {
        workflowEvents.push({ ...event, recorded_at: recordedAt });
      });
      messages.push({
        id: `msg-s01-${stage.id}`, role: "assistant",
        content: "", created_at: recordedAt,
        activities: fixedDemoActivities(stageIndex), route: workflowRoute(requirement.id, true, stageIndex),
        reasoning_summary: "", artifacts: [messageArtifact(stageFile(requirement.id, stageIndex, true))],
        stage_result: fixedDemoStageResult(stageIndex, { confirmed: true }),
      });
    });
    const completedAt = "2026-08-20T08:06:00+08:00";
    workflowEvents.push({
      type: "result", status: "completed", requirement_id: requirement.id,
      current_stage: "solution_review", current_stage_label: "方案审查", reason: "",
      resume_stage: "", completed_stages: workflowStages.map((stage) => stage.id),
      statement_count: 5, validation_mode: "sql",
      message: "方案审查报告已确认，数仓研发需求流程已完成。", recorded_at: completedAt,
    });
    messages.push({
      id: "msg-s01-completed", role: "assistant",
      content: `## 数仓研发需求流程已完成\n- 需求 ID：${requirement.id}\n- 方案审查报告已确认\n- 已完成：需求评审、数仓调研、模型设计、数据开发、数据验证、方案审查\n- 所有提示词和阶段报告已保存到需求目录`,
      created_at: completedAt,
      activities: ["方案审查报告已确认，数仓研发需求流程已完成。"],
      route: { ...workflowRoute(requirement.id, true, 5), reason: "确认方案审查报告并完成流程" },
      reasoning_summary: "", artifacts: [],
    });
    return {
      id: "demo-s01", title: S01_INPUT, task_id: "", task_label: "",
      intent: "requirement", intent_label: "数仓研发需求", requirement_id: requirement.id,
      review_gates: fixedDemoPassedReviewGates(), workspace_id: "demo",
      workflow_status: "completed", workflow_stage: "solution_review", workflow_stage_label: "方案审查",
      workflow_pause_reason: "", workflow_resume_stage: "", workflow_activity_log: [], workflow_events: workflowEvents,
      generation_status: "completed", created_at: timestamp, updated_at: completedAt,
      fixed_demo: true, is_demo: true, scenario_id: "S01", demo_order: 1, messages,
    };
  }

  function requirementFiles(requirementId) {
    return stageFiles.map(([name, displayName, content]) => ({
      name,
      display_name: displayName,
      mime_type: "text/markdown",
      size: new TextEncoder().encode(content).length,
      content,
      updated_at: "2026-08-18T08:00:00.000Z",
      content_url: `/api/requirements/${requirementId}/files/${name}`,
      download_url: `/api/requirements/${requirementId}/files/${name}/download`,
    }));
  }

  function passedReviewGates() {
    const stages = {};
    ["requirement_review", "warehouse_research", "model_design", "data_development", "data_validation", "solution_review"].forEach((stage, index) => {
      stages[stage] = {
        stage,
        status: "passed",
        version: `v1.${index + 1}`,
        artifact_hash: `mock-${stage}`,
        reviewers: [
          { username: "demo.user", status: "confirmed", confirmed_at: "2026-08-18T08:00:00.000Z" },
          { username: "demo.engineer", status: "confirmed", confirmed_at: "2026-08-18T08:02:00.000Z" },
        ],
      };
    });
    return { stages };
  }

  function seedState() {
    const requirementId = "REQ-20260818-001";
    const conversationId = "chat-demo-requirement";
    const files = requirementFiles(requirementId);
    const reviewGates = passedReviewGates();
    const createdAt = "2026-08-18T07:30:00.000Z";
    const updatedAt = "2026-08-18T08:08:00.000Z";
    return {
      schema: 2,
      selectedAccount: "demo.user",
      spaces: [
        { id: "demo", name: "Demo", icon: "AN", color: "#d8f1fb", is_default: true, created_by: "demo.user", created_at: "2026-07-24T00:00:00.000Z" },
        { id: "growth-demo", name: "增长分析", icon: "增", color: "#e8f3dc", is_default: false, created_by: "demo.user", created_at: "2026-08-01T09:00:00.000Z" },
      ],
      users: [
        { username: "demo.user", role: "admin", role_label: "管理员", space_ids: ["demo", "growth-demo"], created_at: "2026-07-24T00:00:00.000Z" },
        { username: "demo.product", role: "data_product_manager", role_label: "数据产品经理", space_ids: ["demo"], created_at: "2026-07-25T00:00:00.000Z" },
        { username: "demo.engineer", role: "dw_engineer", role_label: "数仓工程师", space_ids: ["demo", "growth-demo"], created_at: "2026-07-25T08:00:00.000Z" },
      ],
      roles: clone(builtinRoles),
      conversations: [
        {
          id: conversationId,
          title: "活跃用户指标维度扩展",
          task_id: "",
          task_label: "",
          intent: "requirement",
          intent_label: "数仓研发需求",
          requirement_id: requirementId,
          review_gates: reviewGates,
          workspace_id: "demo",
          workflow_status: "completed",
          workflow_stage: "solution_review",
          workflow_stage_label: "方案审查",
          workflow_pause_reason: "",
          workflow_resume_stage: "",
          workflow_activity_log: [],
          workflow_events: [],
          generation_status: "completed",
          created_at: createdAt,
          updated_at: updatedAt,
          messages: [
            { id: "msg-demo-user", role: "user", content: "为活跃用户指标增加渠道、平台和版本维度，并完成六阶段研发流程。", created_at: createdAt, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
            {
              id: "msg-demo-assistant",
              role: "assistant",
              content: "六阶段研发流程已完成。口径、模型、开发 SQL、验证结果和方案审查报告已归档，可在右侧需求流程中查看各阶段产物。",
              created_at: updatedAt,
              activities: ["已识别为数仓研发需求", "需求评审、数仓调研、模型设计、数据开发、数据验证和方案审查均已完成"],
              route: { intent: "requirement", label: "数仓研发需求", requirement_id: requirementId },
              reasoning_summary: "基于演示数据完成端到端流程。",
              artifacts: files.map((file, index) => ({
                id: `artifact-demo-${index + 1}`,
                name: file.name,
                mime_type: file.mime_type,
                kind: "generated",
                size: file.size,
                content_url: file.content_url,
                download_url: file.download_url,
              })),
            },
          ],
        },
        {
          id: "chat-demo-lineage",
          title: "查询活跃用户指标血缘",
          task_id: "indicator_lineage",
          task_label: "指标与血缘查询",
          intent: "quick_task",
          intent_label: "指标与血缘查询",
          requirement_id: "",
          review_gates: {},
          workspace_id: "demo",
          workflow_status: "",
          workflow_stage: "",
          workflow_stage_label: "",
          generation_status: "completed",
          created_at: "2026-08-17T06:20:00.000Z",
          updated_at: "2026-08-17T06:22:00.000Z",
          messages: [
            { id: "msg-lineage-user", role: "user", content: "查询活跃用户指标的表级血缘。", created_at: "2026-08-17T06:20:00.000Z", activities: [], route: {}, reasoning_summary: "", artifacts: [] },
            { id: "msg-lineage-assistant", role: "assistant", content: "指标由登录明细表汇总到日活 DWS，再供日报 ADS 使用。\n\n`dwd_demo_user_login_detail_di` -> `dws_demo_active_user_1d` -> `ads_demo_active_report_1d`", created_at: "2026-08-17T06:22:00.000Z", activities: ["已选择指标与血缘查询 Agent"], route: { intent: "quick_task", task_id: "indicator_lineage", task_label: "指标与血缘查询", label: "指标与血缘查询" }, reasoning_summary: "", artifacts: [] },
          ],
        },
      ],
      requirements: [
        {
          id: S01_DEMO_REQUIREMENT_ID,
          title: S01_INPUT,
          input_text: S01_INPUT,
          conversation_id: "demo-s01",
          workspace_id: "demo",
          created_by: "demo.user",
          created_at: "2026-08-20T08:01:00+08:00",
          updated_at: "2026-08-20T08:05:00+08:00",
          status: "已暂停",
          current_stage: "需求评审",
          workflow_status: "paused",
          stage_count: 0,
          total_stages: 6,
          type_change_labels: ["报表需求-ADD"],
          type_change_label: "报表需求-ADD",
          fixed_demo: true,
          is_demo: true,
          files: [],
          review_gates: { stages: {} },
        },
        {
          id: requirementId,
          title: "活跃用户指标维度扩展",
          input_text: "为活跃用户指标增加渠道、平台和版本维度。",
          conversation_id: conversationId,
          workspace_id: "demo",
          created_by: "demo.user",
          created_at: createdAt,
          updated_at: updatedAt,
          status: "已完成",
          current_stage: "方案审查",
          stage_count: 6,
          total_stages: 6,
          type_change_labels: ["指标口径变更", "维度扩展"],
          type_change_label: "指标口径变更、维度扩展",
          files,
          review_gates: reviewGates,
        },
      ],
      knowledge: [
        { id: "sql_specs", title: "SQL 开发规范", description: "SQL 开发流程、代码结构和提交规则", filename: "SQL规范.md", category: "warehouse_standards", category_label: "数仓规范", category_order: 10, type_label: "运行时规范", runtime_bound: true, content: "# SQL 开发规范\n\n- 生产 SQL 必须显式限定分区。\n- 禁止使用 `SELECT *`。\n- 写入前必须完成主键、空值和口径校验。", modified_at: updatedAt, exists: true },
        { id: "field_specs", title: "字段规范", description: "字段命名、类型、注释和空值规则", filename: "字段规范.md", category: "warehouse_standards", category_label: "数仓规范", category_order: 10, type_label: "运行时规范", runtime_bound: true, content: "# 字段规范\n\n字段名使用小写下划线形式，指标字段必须包含业务含义和统计周期。", modified_at: updatedAt, exists: true },
        { id: "metric_catalog", title: "指标字典", description: "指标定义、粒度、过滤条件和生效范围", filename: "metric_catalog.md", category: "business_knowledge", category_label: "业务知识", category_order: 20, type_label: "知识说明", runtime_bound: false, content: "# 指标字典\n\n## 活跃用户数\n\n统计周期内至少发生一次有效登录的去重用户数。", modified_at: updatedAt, exists: true },
        { id: "workflow_prompt", title: "需求评审 Prompt", description: "六阶段需求评审节点使用的 Prompt", filename: "01_requirement_review_prompt.md", category: "workflow_prompts", category_label: "工作流 Prompt", category_order: 30, type_label: "运行时 Prompt", runtime_bound: true, content: "# 需求评审 Prompt\n\n识别需求目标、范围、验收标准和阻塞项。", modified_at: updatedAt, exists: true },
        { id: "validation_policy", title: "验证规则与执行策略", description: "验收标准、默认校验项和 SQL 生成策略", filename: "validation_policy.md", category: "validation_policies", category_label: "验证策略", category_order: 50, type_label: "运行时策略", runtime_bound: true, content: "# 验证规则\n\n默认执行主键、空值、枚举、总量和跨表口径校验。", modified_at: updatedAt, exists: true },
      ],
      libraryBases: [
        { id: "kb-metrics", name: "业务指标口径", description: "核心经营指标定义、维度及统计规则", owner: "demo.user", workspace_id: "demo", global_access: false, created_at: createdAt, updated_at: updatedAt, file_count: 1, views: 18, uses: 12 },
        { id: "kb-standards", name: "数仓开发规范", description: "建模、SQL 开发、测试与发布约束", owner: "demo.engineer", workspace_id: "global", global_access: true, created_at: createdAt, updated_at: updatedAt, file_count: 1, views: 11, uses: 9 },
      ],
      libraryFiles: {
        "kb-metrics": [{ id: "file-active-metric", knowledge_base_id: "kb-metrics", workspace_id: "demo", file_name: "活跃用户指标口径.md", status: "learned", tag: "指标维度", summary: "活跃用户定义、去重粒度、维度和过滤条件。", chunk_count: 4, created_at: createdAt, updated_at: updatedAt, content: "# 活跃用户指标口径\n\n按自然日统计有效登录用户，按用户和虚拟应用去重。" }],
        "kb-standards": [{ id: "file-etl-standard", knowledge_base_id: "kb-standards", workspace_id: "global", file_name: "离线 ETL 开发规范.md", status: "learned", tag: "开发规范", summary: "离线任务命名、分区、重跑和质量校验规范。", chunk_count: 6, created_at: createdAt, updated_at: updatedAt, content: "# 离线 ETL 开发规范\n\n所有任务必须可幂等重跑，并显式声明业务日期。" }],
      },
      notificationSettings: {
        enabled: false,
        public_base_url: window.location.origin,
        app_configured: false,
        events: { skill_publish_review: true, skill_publish_reviewed: true, skill_publish_rejected: true, requirement_review: true, warehouse_research: true, model_design: true, data_development: true, data_validation: true, workflow_completed: true },
        routes: {},
        user_mentions: {},
        event_labels: { skill_publish_review: "Skill 发布申请待审核", skill_publish_reviewed: "Skill 发布申请已审核", skill_publish_rejected: "Skill 发布申请已驳回", requirement_review: "需求评审产物待确认", warehouse_research: "数仓调研产物待确认", model_design: "模型设计产物待确认", data_development: "数据开发产物待确认", data_validation: "数据验证产物待确认", workflow_completed: "需求流程已完成" },
        card_themes: { blue: "蓝色", green: "绿色", orange: "橙色", red: "红色" },
        card_variables: { requirement_title: "需求标题", stage_label: "阶段名称", creator: "创建人" },
        card_fields: { skill_title: "Skill 名称", skill_notes: "发布说明", skill_version: "发布版本", submitter: "提交者", reviewer: "审核者", review_reason: "驳回原因", requirement_id: "需求 ID", workspace_name: "工作空间", stage_label: "当前阶段", creator: "创建人" },
        templates: {},
        default_templates: {},
      },
      deliveries: [],
    };
  }

  const versionedKnowledgeDocumentIds = new Set([
    "sql_specs", "sql_writing_specs", "field_specs", "model_specs", "metric_catalog",
    "etl_template_catalog", "game_scope", "requirement_parse_prompt",
    "requirement_feasibility_prompt", "requirement_report_prompt", "warehouse_research_prompt",
    "model_design_prompt", "data_development_prompt", "platform_development_prompt",
    "data_validation_prompt", "paused_action_prompt",
  ]);

  function loadState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (value?.schema === 2 && Array.isArray(value.conversations)) return value;
    } catch (_error) {
      // A clean seed is safer than partially recovering malformed demo state.
    }
    return seedState();
  }

  let state = loadState();
  if (!Array.isArray(state.roles)) state.roles = clone(builtinRoles);
  const validRoleModuleIds = new Set(roleModules.map((module) => module.id));
  state.roles.forEach((role) => {
    role.module_ids = Array.isArray(role.module_ids)
      ? role.module_ids.filter((moduleId) => validRoleModuleIds.has(moduleId))
      : [];
    role.module_count = role.module_ids.length;
  });
  const seededDemoState = seedState();
  const freshDemoConversations = demoConversations();
  const demoConversationIds = new Set(freshDemoConversations.map((item) => item.id));
  state.conversations = [
    ...freshDemoConversations,
    ...state.conversations.filter((item) => !item.is_demo && !String(item.id || "").startsWith("chat-demo-")),
  ];
  state.requirements = [
    ...seededDemoState.requirements.filter((item) => item.is_demo),
    ...state.requirements.filter((item) => !item.is_demo && !demoConversationIds.has(item.conversation_id)),
  ];
  ensureKnowledgeParity();
  ensureKnowledgeCategoryParity();
  ensureReferenceKnowledgeParity();
  ensureLibraryWorkspaceParity();
  saveState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
      // The demo remains usable in memory when storage is unavailable.
    }
  }

  function json(value, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8", "X-AIDW-Mock": "true" },
    });
  }

  function text(value, type = "text/plain; charset=utf-8") {
    return new Response(String(value), { headers: { "Content-Type": type, "X-AIDW-Mock": "true" } });
  }

  function error(detail, status = 400) {
    return json({ detail }, status);
  }

  function requestAccount(options) {
    const headers = new Headers(options?.headers || {});
    return headers.get("X-AIDW-Account") || state.selectedAccount || "demo.user";
  }

  async function requestBody(input, options) {
    if (typeof options?.body === "string") return JSON.parse(options.body || "{}");
    if (input instanceof Request) {
      const raw = await input.clone().text();
      return raw ? JSON.parse(raw) : {};
    }
    return {};
  }

  function publicConversation(conversation) {
    return clone(conversation);
  }

  function conversationSummary(conversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      task_id: conversation.task_id || "",
      task_label: conversation.task_label || "",
      intent: conversation.intent || "",
      intent_label: conversation.intent_label || "",
      requirement_id: conversation.requirement_id || "",
      workspace_id: conversation.workspace_id || "demo",
      workflow_status: conversation.workflow_status || "",
      workflow_stage: conversation.workflow_stage || "",
      workflow_stage_label: conversation.workflow_stage_label || "",
      generation_status: conversation.generation_status || "",
      updated_at: conversation.updated_at || "",
      message_count: (conversation.messages || []).length,
      is_demo: Boolean(conversation.is_demo),
      scenario_id: conversation.scenario_id || "",
      demo_order: Number(conversation.demo_order || 0),
    };
  }

  function createConversation(taskId = "", taskLabel = "", workspaceId = "demo") {
    const timestamp = now();
    const conversation = {
      id: makeId("chat"), title: taskLabel || "新对话", task_id: taskId, task_label: taskLabel,
      intent: taskId ? "quick_task" : "", intent_label: taskLabel, requirement_id: "", review_gates: {},
      workspace_id: workspaceId, workflow_status: "", workflow_stage: "", workflow_stage_label: "",
      workflow_pause_reason: "", workflow_resume_stage: "", workflow_activity_log: [], workflow_events: [],
      generation_status: "", created_at: timestamp, updated_at: timestamp, messages: [],
    };
    state.conversations.unshift(conversation);
    return conversation;
  }

  function mockReply(message, taskId) {
    const clean = String(message || "").trim();
    if (taskId === "indicator_lineage") return "已完成指标血缘检索。\n\n`dwd_demo_user_login_detail_di` -> `dws_demo_active_user_1d` -> `ads_demo_active_report_1d`\n\n上游提供登录明细，中间层按用户和自然日去重，下游用于活跃用户日报。";
    if (taskId === "validation_sql") return "已生成演示校验 SQL：\n\n```sql\nSELECT ds, COUNT(*) AS row_cnt, COUNT(DISTINCT user_id) AS user_cnt\nFROM dm_demo.dws_demo_active_user_1d\nWHERE ds = '${bizdate}'\nGROUP BY ds;\n```";
    if (taskId === "sql_review") return "SQL 规范检查完成：分区条件完整，未发现 `SELECT *`；建议补充主键唯一性和空值校验。";
    return `已收到：“${clean || "请识别附件内容"}”。\n\n当前为 GitHub Pages Mock 演示环境，回答和操作使用浏览器本地示例数据，不会连接真实数仓或生产服务。`;
  }

  function sse(events) {
    return text(events.map(([name, payload]) => `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`).join(""), "text/event-stream; charset=utf-8");
  }

  function isRequirementMessage(message) {
    const value = String(message || "").toLowerCase();
    return /(?:完整需求|数仓需求|需求开发|建表|新增字段|指标口径|数据开发|模型设计|帮我做|帮我开发|feishu\.cn\/(?:wiki|docx|docs)|larksuite\.com\/(?:wiki|docx|docs))/.test(value);
  }

  function supplementLabels(message) {
    const match = String(message || "").match(/^【本次补充关联】([^\n]+)/);
    return match ? match[1].split("｜").map((item) => item.trim()).filter(Boolean) : [];
  }

  function mockAttachmentArtifacts(attachments) {
    return (attachments || []).map((attachment, index) => ({
      id: makeId(`attachment-${index + 1}`),
      name: String(attachment.name || `补充材料-${index + 1}`),
      mime_type: String(attachment.mime_type || "application/octet-stream"),
      size: Math.round(String(attachment.content_base64 || "").length * 0.75),
      kind: "attachment",
      content_url: `data:${attachment.mime_type || "application/octet-stream"};base64,${attachment.content_base64 || ""}`,
      download_url: `data:${attachment.mime_type || "application/octet-stream"};base64,${attachment.content_base64 || ""}`,
    }));
  }

  function isFixedDemoInput(message) {
    return String(message || "").trim() === S01_INPUT;
  }

  function isFixedDemoConversation(conversation) {
    if (typeof conversation?.fixed_demo === "boolean") return conversation.fixed_demo;
    return Boolean(
      listFrom(conversation?.messages).some((message) => message.role === "user" && isFixedDemoInput(message.content)),
    );
  }

  function fixedDemoStageDetail(stageId, requirementId) {
    const details = {
      requirement_review: {
        detail_type: "requirement_parse",
        raw_json: {
          requirement_version: requirementId,
          requirement_type: "报表需求",
          change_route: { mode: "ADD" },
        },
        groups: [
          { title: "基本信息", items: [
            { label: "需求版本", value: requirementId },
            { label: "需求摘要", value: "为示例转化报表新增等级标签维度。" },
            { label: "游戏/产品", value: "示例游戏" },
            { label: "需求类型", value: "报表需求" },
          ] },
          { title: "需求对象", items: [
            { label: "报表", value: "示例转化报表下全部自助分析" },
            { label: "维度", value: "等级标签 level_tag" },
            { label: "粒度", value: "ds、appid、level_id、level_tag" },
          ] },
          { title: "时间与验收", items: [
            { label: "回溯范围", value: "2026-07-01 至上线前一天" },
            { label: "验收标准", value: "指标与用户数一致、空值率小于 1%、分区连续" },
          ] },
        ],
      },
      warehouse_research: { groups: [{ title: "资产定位", items: [
        { label: "来源表", value: "dwd_demo.dwd_level_play_di" },
        { label: "目标表", value: "ads_demo.ads_super_bird_report_di" },
        { label: "来源字段", value: "level_tag" },
      ] }] },
      model_design: { groups: [{ title: "模型变更", items: [
        { label: "新增字段", value: "level_tag STRING" },
        { label: "空值处理", value: "UNKNOWN" },
        { label: "指标口径", value: "保持不变" },
      ] }] },
      data_development: { groups: [{ title: "开发产物", items: [
        { label: "目标表", value: "ads_demo.ads_super_bird_report_di" },
        { label: "调度时间", value: "每日 06:00" },
        { label: "回溯方式", value: "按天补跑" },
      ] }] },
      data_validation: { groups: [{ title: "验证概览", items: [
        { label: "SQL 数量", value: "5" },
        { label: "执行方式", value: "仅生成，不执行" },
        { label: "覆盖范围", value: "一致性、空值率、分区连续性、记录数、性能" },
      ] }] },
      solution_review: { groups: [{ title: "审查结论", items: [
        { label: "审查范围", value: "需求、模型、代码、验证全链路" },
        { label: "验证覆盖", value: "口径、质量、完整性、性能" },
        { label: "上线风险", value: "低" },
        { label: "审查结论", value: "方案完整，可以进入最终确认" },
      ] }] },
    };
    return details[stageId];
  }

  function fixedDemoStageResult(stageIndex, { version = "V1.0", confirmed = false } = {}) {
    const results = [
      {
        stage: "requirement_review", stage_label: "需求评审", state: "awaiting_confirmation", state_label: "待确认",
        gate_label: confirmed ? "已确认" : "待确认",
        objective: "确认需求范围、指标口径、回溯边界与验收标准。",
        summary: "需求内容已完成结构化评审，研发边界和验收条件已经明确。",
        execution: {
          label: "执行详情 · 已完成 3 项",
          items: ["校验所选口径与目标分析粒度", "完善历史回溯与验收规则", "生成最终评审结论与阶段报告"],
        },
        findings: [
          "需求范围为示例转化报表路径下的全部自助分析。",
          "新增等级标签 level_tag，现有指标口径保持不变。",
          "回溯范围为 2026-07-01 至上线前一天，按日更新。",
          "验收覆盖汇总值与用户数一致性、标签空值率和分区连续性。",
        ],
        artifact: { name: "需求评审报告", meta: "Markdown · 待评审", version },
        next_step: confirmed
          ? "流程已进入数仓调研。"
          : "请在右侧流程区确认需求评审报告，确认后进入数仓调研。",
      },
      {
        stage: "warehouse_research", stage_label: "数仓调研", state: "awaiting_confirmation", state_label: "待确认",
        gate_label: "待确认",
        objective: "定位来源字段、目标物理表、生产链路与调度依赖。",
        summary: "调研所需资产和链路已经定位，可据此进入模型设计。",
        execution: {
          label: "执行详情 · 已完成 3 项",
          items: ["检索等级标签候选来源", "核对目标报表物理资产与字段清单", "梳理生产链路和调度依赖"],
        },
        findings: [
          "等级标签来源为 dwd_demo.dwd_level_play_di.level_tag。",
          "目标表为 ads_demo.ads_super_bird_report_di。",
          "生产链路为来源明细表到 ADS 目标表，再供示例转化报表使用。",
          "任务依赖来源表当日 ds 分区，每日 06:00 产出。",
        ],
        artifact: { name: "数仓调研报告", meta: "Markdown · 待评审", version },
        next_step: "请在右侧流程区确认数仓调研报告，确认后进入模型设计。",
      },
      {
        stage: "model_design", stage_label: "模型设计", state: "awaiting_confirmation", state_label: "待确认",
        gate_label: "待确认",
        objective: "确定目标字段、聚合粒度、空值策略与回溯方案。",
        summary: "模型变更范围已经固定，现有指标口径不会被改写。",
        execution: {
          label: "执行详情 · 已完成 3 项",
          items: ["核对目标表结构和现有粒度", "评估新增维度对聚合结果的影响", "形成字段映射与模型变更方案"],
        },
        findings: [
          "目标表新增 level_tag STRING 字段。",
          "聚合粒度调整为 ds、appid、level_id、level_tag。",
          "level_tag 空值统一回填 UNKNOWN。",
          "现有指标计算口径保持不变，历史分区按天回溯。",
        ],
        artifact: { name: "模型设计报告", meta: "Markdown · 待评审", version },
        next_step: "请在右侧流程区确认模型设计报告，确认后进入数据开发。",
      },
      {
        stage: "data_development", stage_label: "数据开发", state: "awaiting_confirmation", state_label: "待确认",
        gate_label: "待确认",
        objective: "生成可评审的 ETL、分区策略、调度配置与回溯方案。",
        summary: "代码范围与模型设计保持一致，ETL、分区和调度方案已经明确。",
        execution: {
          label: "执行详情 · 已完成 3 项",
          items: ["生成目标表 ETL SQL", "配置分区与上游依赖", "生成按日回溯执行方案"],
        },
        findings: [
          "ETL 已透传 level_tag，并使用 UNKNOWN 处理空值。",
          "目标表按 ds 和 appid 分区覆盖写入。",
          "调度时间为每日 06:00，依赖来源表当日分区。",
          "2026-07-01 至上线前一天按天补跑。",
        ],
        artifact: { name: "数仓开发结果", meta: "Markdown / SQL · 待评审", version },
        next_step: "请在右侧流程区确认数据开发结果，确认后进入数据验证。",
      },
      {
        stage: "data_validation", stage_label: "数据验证", state: "awaiting_confirmation", state_label: "待确认",
        gate_label: "待确认",
        objective: "生成覆盖口径、质量、回溯完整性与性能的验收 SQL。",
        summary: "验证规则已经覆盖口径、质量、回溯完整性与性能要求。",
        execution: {
          label: "执行详情 · 已完成 3 项",
          items: ["将验收标准转换为验证规则", "生成 5 组校验 SQL", "核对规则覆盖范围与通过条件"],
        },
        findings: [
          "覆盖改造前后指标汇总值与用户数一致性。",
          "覆盖 level_tag 空值率小于 1% 的质量门槛。",
          "覆盖回溯日期分区连续性和记录数增幅检查。",
          "覆盖改造前后查询耗时对比。",
        ],
        artifact: { name: "数据验证结果", meta: "Markdown / SQL · 待评审", version },
        next_step: "请在右侧流程区确认数据验证结果，确认后进入方案审查。",
      },
      {
        stage: "solution_review", stage_label: "方案审查", state: "awaiting_confirmation", state_label: "待确认",
        gate_label: "待确认",
        objective: "综合审查需求、模型、代码和验证结果，确认方案完整性与上线风险。",
        summary: "方案范围、实现结果、验证覆盖和上线风险已经完成综合审查。",
        execution: {
          label: "执行详情 · 已完成 3 项",
          items: ["汇总全链路阶段结论", "核对需求与实现一致性", "评估上线风险并形成审查结论"],
        },
        findings: [
          "实现范围与原始需求一致，现有指标口径保持不变。",
          "模型字段、聚合粒度、分区和回溯策略与开发结果一致。",
          "数据验证已覆盖口径、质量、完整性和性能要求。",
          "当前上线风险为低，接入真实环境前仍需执行验证 SQL。",
        ],
        artifact: { name: "方案审查报告", meta: "Markdown · 待评审", version },
        next_step: "请在右侧流程区确认方案审查报告，确认后完成流程。",
      },
    ];
    const result = clone(results[stageIndex]);
    const executionDurations = ["01:18", "02:46", "01:52", "03:24", "01:37", "00:42"];
    const executionSummaries = [
      [
        "已校验所选等级标签口径与目标报表的用户日分析粒度，确认维度定义可用于后续模型设计。",
        "已按所选口径完善 2026-07-01 至上线前一天的历史回溯范围，并补齐一致性、空值率和分区连续性验收规则。",
        "已汇总最终评审结论并生成需求评审报告，当前等待流程区确认。",
      ],
      [
        "已检索等级标签相关资产，并筛选出可复用的候选来源。",
        "已核对目标报表绑定的物理表、字段清单与数据粒度。",
        "已梳理来源表至目标表的生产链路、分区和调度依赖。",
      ],
      [
        "已核对目标表结构、分区方式及当前聚合粒度。",
        "已评估新增 level_tag 对聚合层级、数据量和原指标的影响。",
        "已形成字段映射、空值策略和历史数据回溯方案。",
      ],
      [
        "已按模型设计生成目标表 ETL SQL，并透传 level_tag。",
        "已补充分区写入策略、上游依赖和每日调度配置。",
        "已生成 2026-07-01 至上线前一天的按日回溯方案。",
      ],
      [
        "已将验收标准转换为一致性、质量和完整性验证规则。",
        "已生成 5 组校验 SQL，当前仅生成脚本、不连接真实数仓执行。",
        "已核对规则覆盖范围、通过条件及查询性能对比要求。",
      ],
      [
        "已汇总需求评审、模型设计、数据开发和数据验证的阶段结论。",
        "已核对需求范围、指标口径、模型设计与实现结果的一致性。",
        "已评估上线前剩余风险并形成最终方案审查结论。",
      ],
    ];
    result.execution.duration_label = `耗时 ${executionDurations[stageIndex]}`;
    result.execution.items = result.execution.items.map((label, index) => ({
      label,
      summary: executionSummaries[stageIndex][index],
    }));
    result.summary = `${result.artifact.name}已生成。${result.summary}`;
    if (confirmed) {
      const nextStage = workflowStages[stageIndex + 1];
      result.state = "completed";
      result.state_label = "已完成";
      result.gate_label = "已确认";
      result.summary = result.summary.replace(`${result.artifact.name}已生成。`, `${result.artifact.name}已确认。`);
      result.artifact.meta = result.artifact.meta.replace("待评审", "已确认");
      result.next_step = nextStage
        ? `${result.artifact.name}已确认，流程已进入${nextStage.label}。`
        : "方案审查报告已确认，数仓研发需求流程已完成。";
    }
    return result;
  }

  function fixedDemoMissingMaterialStageResult() {
    return {
      stage: "warehouse_research", stage_label: "数仓调研", state: "blocked", state_label: "需补充材料",
      gate_label: "3 项待补",
      objective: "定位来源字段、目标物理表、生产链路与调度依赖。",
      summary: "当前信息不足以形成数仓调研结论，以下 3 项材料补齐并通过校验后将自动续跑。",
      execution: {
        label: "执行详情 · 已完成资产检索",
        items: ["检索候选事实表与等级标签口径", "核对现有生产链路", "识别影响调研结论的缺失信息"],
      },
      findings: [
        "确认 B 报表实际绑定的物理表。",
        "补充目标自助分析的字段清单。",
        "确认回溯截止日期。",
      ],
      next_step: "",
    };
  }

  function stageFile(requirementId, stageIndex, fixedDemo = false) {
    const [name, displayName, content] = (fixedDemo ? fixedDemoStageFiles : stageFiles)[stageIndex];
    return {
      name,
      display_name: displayName,
      mime_type: "text/markdown",
      size: new TextEncoder().encode(content).length,
      content,
      updated_at: now(),
      content_url: `/api/requirements/${requirementId}/files/${name}`,
      download_url: `/api/requirements/${requirementId}/files/${name}/download`,
    };
  }

  function messageArtifact(file) {
    return {
      id: makeId("artifact"), name: file.name, mime_type: file.mime_type,
      kind: "generated", size: file.size, content_url: file.content_url, download_url: file.download_url,
    };
  }

  function workflowRoute(requirementId, fixedDemo = false, stageIndex = 0) {
    const reason = fixedDemo
      ? (stageIndex === 0 ? "命中固定六阶段测试需求" : `从${workflowStages[stageIndex].label}继续`)
      : "Mock 意图识别命中完整数仓研发需求";
    return {
      intent: "requirement",
      label: "数仓研发需求",
      requirement_id: requirementId,
      task_id: "",
      task_label: "",
      reason,
      workflow_stage: workflowStages[stageIndex]?.id || "requirement_review",
      workflow_stage_label: workflowStages[stageIndex]?.label || "需求评审",
      skill: { name: `${workflowStages[stageIndex]?.label || "需求评审"} skill`, version: "v1.0" },
      next_action: "进入需求处理流程",
      intent_analysis: {
        summary: "已完成输入解析、任务目标提取和处理类型识别。",
        status: "completed",
        completed_count: 3,
        duration_ms: 3000,
        items: [
          { label: "读取用户输入与链接信息", status: "completed", summary: "Mock 后端已读取用户输入和需求链接。" },
          { label: "提取任务目标与交付范围", status: "completed", summary: "Mock 后端已提取任务目标和交付范围。" },
          { label: "匹配任务类型与处理流程", status: "completed", summary: `Mock 后端识别结果：数仓研发需求；识别依据：${reason}。` },
        ],
      },
      restart_stage: "",
      preserve_workflow_events: Boolean(fixedDemo && stageIndex > 0),
    };
  }

  function createWorkflowRequirement(conversation, title, inputText, account, workspaceId = "demo") {
    const fixedDemo = conversation.is_demo && isFixedDemoInput(inputText);
    const reusableDemoRequirement = fixedDemo
      ? state.requirements.find((item) => item.id === S01_DEMO_REQUIREMENT_ID)
      : null;
    const requirementId = reusableDemoRequirement?.id
      || `REQ-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(state.requirements.length + 1).padStart(3, "0")}`;
    const timestamp = now();
    const requirementData = {
      id: requirementId,
      title: fixedDemo ? "示例转化报表增加等级标签维度" : (title || String(inputText || "新建数仓需求").slice(0, 28)),
      input_text: String(inputText || ""),
      conversation_id: conversation.id,
      workspace_id: workspaceId,
      created_by: account || "demo.user",
      created_at: timestamp,
      updated_at: timestamp,
      status: "进行中",
      current_stage: "需求评审",
      workflow_status: "running",
      stage_count: 0,
      total_stages: workflowStages.length,
      type_change_labels: ["指标口径变更", "数据开发"],
      type_change_label: "指标口径变更、数据开发",
      files: [],
      artifact_versions: {},
      review_gates: { stages: {} },
      fixed_demo: isFixedDemoInput(inputText),
      is_demo: Boolean(conversation.is_demo),
    };
    const requirement = reusableDemoRequirement || requirementData;
    if (reusableDemoRequirement) Object.assign(requirement, requirementData);
    else state.requirements.unshift(requirement);
    conversation.title = String(
      conversation.messages.find((message) => message.role === "user")?.content || inputText || requirement.title,
    ).trim();
    conversation.intent = "requirement";
    conversation.intent_label = "数仓研发需求";
    conversation.requirement_id = requirementId;
    conversation.review_gates = requirement.review_gates;
    conversation.workflow_status = "running";
    conversation.workflow_stage = "requirement_review";
    conversation.workflow_stage_label = "需求评审";
    conversation.generation_status = "running";
    conversation.pending_stage = 0;
    conversation.fixed_demo = requirement.fixed_demo;
    return requirement;
  }

  function workflowGate(stage, fixedDemo = false, requirement = null) {
    const existingCount = requirement?.artifact_versions?.[stage.id]?.length || 0;
    return {
      stage: stage.id,
      stage_label: stage.label,
      status: "awaiting_confirmation",
      version: `V1.${existingCount}`,
      artifact_hash: `mock-${stage.id}-${Date.now()}`,
      reviewers: (fixedDemo ? [{ username: state.selectedAccount || "demo.user" }] : state.users)
        .map((user) => ({ username: user.username, status: "pending", confirmed_at: "" })),
    };
  }

  function archiveStageVersion(requirement, stage, file, gate) {
    if (!requirement || !stage || !file || !gate?.version) return;
    requirement.artifact_versions ||= {};
    const versions = requirement.artifact_versions[stage.id] ||= [];
    const snapshot = {
      stage: stage.id,
      stage_label: stage.label,
      version: gate.version,
      artifact_hash: gate.artifact_hash || contentHash(file.content),
      created_at: gate.created_at || gate.updated_at || now(),
      report_file: file.name,
      name: file.name,
      display_name: file.display_name,
      mime_type: file.mime_type,
      size: file.size,
      content: file.content,
    };
    const existing = versions.findIndex((item) => item.version === snapshot.version);
    if (existing >= 0) versions[existing] = snapshot;
    else versions.push(snapshot);
  }

  function artifactVersionItems(requirement, stageId) {
    const stageIndex = workflowStages.findIndex((item) => item.id === stageId);
    if (!requirement || stageIndex < 0) return [];
    const stage = workflowStages[stageIndex];
    const gate = requirement.review_gates?.stages?.[stageId] || null;
    let versions = clone(requirement.artifact_versions?.[stageId] || []);
    if (!versions.length && gate) {
      const fileName = (gate.report_file || (requirement.fixed_demo ? fixedDemoStageFiles : stageFiles)[stageIndex][0]);
      const file = requirement.files?.find((item) => item.name === fileName) || stageFile(requirement.id, stageIndex, Boolean(requirement.fixed_demo));
      versions = [{
        stage: stageId, stage_label: stage.label, version: gate.version || "V1.0",
        artifact_hash: gate.artifact_hash || contentHash(file.content), created_at: gate.created_at || requirement.updated_at || now(),
        report_file: file.name, name: file.name, display_name: file.display_name,
        mime_type: file.mime_type, size: file.size, content: file.content,
      }];
    }
    const currentVersion = gate?.version || versions.at(-1)?.version || "";
    return versions.sort((left, right) => String(right.version).localeCompare(String(left.version), undefined, { numeric: true })).map((item) => ({
      ...item,
      is_current: item.version === currentVersion,
      content_url: `/api/requirements/${requirement.id}/review-gates/${stageId}/versions/${encodeURIComponent(item.version)}`,
      download_url: `/api/requirements/${requirement.id}/review-gates/${stageId}/versions/${encodeURIComponent(item.version)}/download`,
    }));
  }

  function fixedDemoWorkflowEvents(requirement, stageIndex, { pause = true } = {}) {
    const stage = workflowStages[stageIndex];
    const completedStages = workflowStages.slice(0, stageIndex + 1).map((item) => item.id);
    const recordedAt = now();
    const events = [{
      type: "progress", stage: stage.id, stage_label: stage.label, status: "started",
      message: `正在生成固定${stage.label}测试内容...`,
      completed_stages: completedStages.slice(0, -1), recorded_at: recordedAt,
    }];
    if (stage.id === "requirement_review") {
      events.push({
        type: "progress", stage: stage.id, stage_label: stage.label, status: "running",
        message: "固定需求文档读取完成：1843 字符、2/2 张图片可读取",
        completed_stages: [], activity_step: "load", activity_status: "completed",
        detail: { groups: [{ title: "文档摘要", items: [
          { label: "摘要", value: "为示例转化报表新增等级标签维度，用于筛选、分组和下钻。" },
          { label: "标题", value: "示例转化报表增加等级标签维度" },
          { label: "来源", value: S01_INPUT.replace("帮我做下这个需求", "") },
          { label: "图片", value: "2/2 张可读取", status: "passed" },
        ] }] }, recorded_at: recordedAt,
      });
    }
    events.push({
      type: "progress", stage: stage.id, stage_label: stage.label, status: "completed",
      message: `固定${stage.label}测试内容已生成`, requirement_id: requirement.id,
      completed_stages: completedStages,
      activity_step: stage.id === "requirement_review" ? "parse" : "result",
      activity_status: "completed", detail: fixedDemoStageDetail(stage.id, requirement.id), recorded_at: recordedAt,
    });
    if (pause) {
      const nextStage = workflowStages[stageIndex + 1] || stage;
      events.push({
        type: "result", status: "paused", requirement_id: requirement.id,
        current_stage: stageIndex === workflowStages.length - 1 ? stage.id : nextStage.id,
        current_stage_label: stageIndex === workflowStages.length - 1 ? stage.label : nextStage.label,
        reason: stage.reason,
        resume_stage: stageIndex === workflowStages.length - 1 ? "" : nextStage.id,
        completed_stages: completedStages,
        statement_count: stage.id === "data_validation" ? 5 : 0,
        generated_rules: stage.id === "data_validation"
          ? Array.from({ length: 5 }, (_, index) => ({ rule_id: `V${String(index + 1).padStart(3, "0")}`, instances: 1 }))
          : [],
        validation_mode: "sql", recorded_at: recordedAt,
      });
    }
    return events;
  }

  function workflowEventsForStage(requirement, stageIndex, { pause = true } = {}) {
    if (requirement.fixed_demo) return fixedDemoWorkflowEvents(requirement, stageIndex, { pause });
    const stage = workflowStages[stageIndex];
    const completedStages = workflowStages.slice(0, stageIndex + 1).map((item) => item.id);
    const recordedAt = now();
    const nextStage = workflowStages[stageIndex + 1] || stage;
    const progress = [
      {
        type: "progress", stage: stage.id, stage_label: stage.label, status: "started",
        message: `正在执行${stage.label}...`, completed_stages: completedStages.slice(0, -1), recorded_at: recordedAt,
      },
      {
        type: "progress", stage: stage.id, stage_label: stage.label, status: "running",
        message: `${stage.label}正在读取输入与 Mock 数据资产`, completed_stages: completedStages.slice(0, -1),
        activity_step: stageIndex === 0 ? "parse" : "load", activity_status: "completed", recorded_at: recordedAt,
        detail: { groups: [{ title: "执行摘要", items: [{ label: "数据来源", value: "脱敏 Mock 数据" }, { label: "执行版本", value: mockVersion }] }] },
      },
      {
        type: "progress", stage: stage.id, stage_label: stage.label, status: "completed",
        message: `${stage.label}产物已生成`, requirement_id: requirement.id, completed_stages: completedStages,
        activity_step: "result", activity_status: "completed", recorded_at: recordedAt,
      },
    ];
    if (pause) {
      progress.push({
        type: "result", status: "paused", requirement_id: requirement.id,
        current_stage: stageIndex === workflowStages.length - 1 ? stage.id : nextStage.id,
        current_stage_label: stageIndex === workflowStages.length - 1 ? stage.label : nextStage.label,
        reason: stage.reason,
        resume_stage: stageIndex === workflowStages.length - 1 ? "" : nextStage.id,
        completed_stages: completedStages,
        recorded_at: recordedAt,
      });
    }
    return progress;
  }

  function runWorkflowStage(conversation, stageIndex, { pause = true } = {}) {
    const requirement = state.requirements.find((item) => item.id === conversation.requirement_id);
    if (!requirement) throw new Error("需求不存在");
    const stage = workflowStages[stageIndex];
    const fixedDemo = isFixedDemoConversation(conversation) || Boolean(requirement.fixed_demo);
    requirement.fixed_demo = fixedDemo;
    const file = stageFile(requirement.id, stageIndex, fixedDemo);
    const existingFile = requirement.files.findIndex((item) => item.name === file.name);
    if (existingFile >= 0) requirement.files[existingFile] = file;
    else requirement.files.push(file);
    requirement.stage_count = Math.max(requirement.stage_count || 0, stageIndex + 1);
    requirement.updated_at = now();
    const events = workflowEventsForStage(requirement, stageIndex, { pause });
    conversation.workflow_events = [...(conversation.workflow_events || []), ...events];
    conversation.updated_at = now();
    conversation.pending_stage = null;

    let gate = null;
    if (pause) {
      gate = workflowGate(stage, fixedDemo, requirement);
      requirement.review_gates.stages[stage.id] = gate;
      archiveStageVersion(requirement, stage, file, gate);
      conversation.review_gates = requirement.review_gates;
      conversation.workflow_status = "paused";
      conversation.workflow_stage = stageIndex === workflowStages.length - 1 ? stage.id : workflowStages[stageIndex + 1].id;
      conversation.workflow_stage_label = stageIndex === workflowStages.length - 1 ? stage.label : workflowStages[stageIndex + 1].label;
      conversation.workflow_pause_reason = stage.reason;
      conversation.workflow_resume_stage = stageIndex === workflowStages.length - 1 ? "" : workflowStages[stageIndex + 1].id;
      conversation.generation_status = "completed";
      requirement.status = "已暂停";
      requirement.workflow_status = "paused";
      requirement.current_stage = conversation.workflow_stage_label;
    } else if (stageIndex === workflowStages.length - 1) {
      conversation.workflow_status = "completed";
      conversation.workflow_stage = stage.id;
      conversation.workflow_stage_label = stage.label;
      conversation.workflow_pause_reason = "";
      conversation.workflow_resume_stage = "";
      conversation.generation_status = "completed";
      requirement.status = "已完成";
      requirement.workflow_status = "completed";
      requirement.current_stage = stage.label;
    }
    if (!pause) archiveStageVersion(requirement, stage, file, { version: "V1.0", artifact_hash: contentHash(file.content), created_at: now() });
    return { requirement, stage, file, events, gate };
  }

  function fixedDemoActivities(stageIndex) {
    const stage = workflowStages[stageIndex];
    const leading = stageIndex === 0
      ? "开始解析输入内容，识别任务目标、信息范围和处理类型。"
      : `已定位到上次停止的${stage.label}，准备从该阶段继续。`;
    const activities = [leading, `正在生成固定${stage.label}测试内容...`];
    if (stageIndex === 0) activities.push("固定需求文档读取完成：1843 字符、2/2 张图片可读取");
    activities.push(`固定${stage.label}测试内容已生成`);
    return activities;
  }

  function workflowAssistant(conversation, result, content = "") {
    const stageIndex = workflowStages.findIndex((stage) => stage.id === result.stage.id);
    const fixedDemo = isFixedDemoConversation(conversation) || Boolean(result.requirement.fixed_demo);
    const message = {
      id: makeId("msg"), role: "assistant",
      content: fixedDemo ? "" : (content || `${result.stage.label}已完成，请查看阶段产物。`),
      created_at: now(),
      activities: fixedDemo ? [] : [`已完成${result.stage.label} Mock 执行`],
      route: workflowRoute(result.requirement.id, fixedDemo, stageIndex),
      reasoning_summary: fixedDemo ? "" : `按照 AIDW ${mockVersion} 流程生成脱敏阶段产物。`,
      stage_result: fixedDemo ? fixedDemoStageResult(stageIndex) : null,
      artifacts: [messageArtifact(result.file)],
    };
    conversation.messages.push(message);
    return message;
  }

  function fixedDemoRequirementConfirmationStream(conversation, requirement, prefixEvents = []) {
    const pausedAtDate = new Date();
    const reviewStartedAt = new Date(pausedAtDate.getTime() - 46000).toISOString();
    const pausedAt = pausedAtDate.toISOString();
    const workflowEvents = [
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "started",
        message: "正在读取需求正文、表格和图片内容", completed_stages: [], recorded_at: reviewStartedAt,
      },
      {
        type: "progress", stage: "requirement_review", stage_label: "需求评审", status: "running",
        message: "需求范围和验收条件已完成结构化解析", completed_stages: [],
        activity_step: "parse", activity_status: "completed", recorded_at: pausedAt,
      },
      {
        type: "result", status: "paused", requirement_id: requirement.id,
        current_stage: "requirement_review", current_stage_label: "需求评审",
        reason: "等待确认等级标签口径", resume_stage: "requirement_review",
        completed_stages: [], recorded_at: pausedAt,
      },
    ];
    const message = {
      id: makeId("msg"), role: "assistant", content: "", created_at: pausedAt, activities: [],
      route: workflowRoute(requirement.id, true, 0), reasoning_summary: "", artifacts: [],
      stage_result: fixedDemoConfirmationStageResult(),
      confirmation_request: fixedDemoRequirementConfirmation(),
    };
    conversation.intent = "requirement";
    conversation.intent_label = "数仓研发需求";
    conversation.requirement_id = requirement.id;
    conversation.review_gates = { stages: {} };
    conversation.workflow_status = "paused";
    conversation.workflow_stage = "requirement_review";
    conversation.workflow_stage_label = "需求评审";
    conversation.workflow_pause_reason = "等待确认等级标签口径";
    conversation.workflow_resume_stage = "requirement_review";
    conversation.workflow_events = workflowEvents;
    conversation.generation_status = "completed";
    conversation.pending_stage = null;
    conversation.updated_at = pausedAt;
    conversation.messages.push(message);
    requirement.status = "已暂停";
    requirement.current_stage = "需求评审";
    requirement.workflow_status = "paused";
    requirement.stage_count = 0;
    requirement.files = [];
    requirement.review_gates = { stages: {} };
    requirement.updated_at = pausedAt;
    saveState();
    return sse([
      ...prefixEvents,
      ...workflowEvents.map((event) => ["workflow", event]),
      ["complete", { message }],
    ]);
  }

  function stageStream(conversation, stageIndex, prefixEvents = []) {
    const requirement = state.requirements.find((item) => item.id === conversation.requirement_id);
    if (
      stageIndex === 0
      && requirement
      && (isFixedDemoConversation(conversation) || requirement.fixed_demo)
    ) {
      return fixedDemoRequirementConfirmationStream(conversation, requirement, prefixEvents);
    }
    if (isFixedDemoConversation(conversation) && stageIndex > 0) {
      conversation.workflow_events = (conversation.workflow_events || []).filter((event) => event.type !== "result");
    }
    const result = runWorkflowStage(conversation, stageIndex, { pause: true });
    const message = workflowAssistant(conversation, result);
    saveState();
    const streamEvents = result.events.map((event) => ["workflow", event]);
    if (result.gate) streamEvents.push(["review_gate", result.gate]);
    streamEvents.push(["complete", { message }]);
    return sse([...prefixEvents, ...streamEvents]);
  }

  function fixedDemoSupplementStream(conversation, requirement, userMessage, labels) {
    const stageId = "warehouse_research";
    const currentGate = requirement.review_gates.stages[stageId];
    const selectedKeys = new Set(labels.map((label) => label.toLocaleLowerCase()));
    const currentMaterials = (currentGate.missing_materials || []).map((item) => ({ ...item }));
    const accepted = currentMaterials.filter((item) => selectedKeys.has(String(item.label || "").toLocaleLowerCase()));
    const remaining = currentMaterials.filter((item) => !selectedKeys.has(String(item.label || "").toLocaleLowerCase()));
    const checkingGate = { ...clone(currentGate), status: "checking" };
    requirement.review_gates.stages[stageId] = checkingGate;
    conversation.review_gates = requirement.review_gates;

    let finalGate;
    let assistantContent;
    if (remaining.length) {
      finalGate = {
        ...checkingGate,
        status: "awaiting_materials",
        missing_materials: remaining.map((item, index) => ({ ...item, id: `material-${index + 1}`, status: "pending" })),
        updated_at: now(),
      };
      assistantContent = `## 本次补充已校验\n- 已补充 ${accepted.length} 项\n- 仍有 ${remaining.length} 项阻塞内容待补充\n- 数仓调研继续暂停，补齐后系统会自动再次校验`;
    } else {
      const report = stageFile(requirement.id, 1, true);
      const existingFile = requirement.files.findIndex((item) => item.name === report.name);
      if (existingFile >= 0) requirement.files[existingFile] = report;
      else requirement.files.push(report);
      finalGate = {
        ...checkingGate,
        status: "awaiting_confirmation",
        version: "V1.1",
        artifact_hash: `s01-warehouse-research-${Date.now()}`,
        report_file: report.name,
        missing_materials: [],
        reviewers: [],
        updated_at: now(),
      };
      requirement.artifact_versions ||= {};
      requirement.artifact_versions[stageId] ||= [];
      if (!requirement.artifact_versions[stageId].some((item) => item.version === "V1.0")) {
        const draft = {
          ...report,
          content: "# 数仓调研报告\n\n## V1.0 初稿\n\n已完成候选表与链路检索，但目标物理表、字段清单和回溯截止日期尚未确认。\n\n> 该版本因材料不完整未进入确认。",
        };
        draft.size = new TextEncoder().encode(draft.content).length;
        archiveStageVersion(requirement, workflowStages[1], draft, { version: "V1.0", artifact_hash: contentHash(draft.content), created_at: currentGate.updated_at || now() });
      }
      archiveStageVersion(requirement, workflowStages[1], report, finalGate);
      requirement.stage_count = 2;
      requirement.current_stage = "模型设计";
      conversation.workflow_stage = "model_design";
      conversation.workflow_stage_label = "模型设计";
      conversation.workflow_pause_reason = "请确认数仓调研报告后继续";
      conversation.workflow_resume_stage = "model_design";
      const recordedAt = now();
      conversation.workflow_events = [
        ...(conversation.workflow_events || []).filter((event) => event.type !== "result"),
        {
          type: "progress", stage: stageId, stage_label: "数仓调研", status: "completed",
          message: "全部阻塞项已解除，数仓调研报告 V1.1 已生成", requirement_id: requirement.id,
          completed_stages: ["requirement_review", stageId], activity_step: "result", activity_status: "completed",
          recorded_at: recordedAt,
        },
        {
          type: "result", status: "paused", requirement_id: requirement.id,
          current_stage: "model_design", current_stage_label: "模型设计",
          reason: "请确认数仓调研报告后继续", resume_stage: "model_design",
          completed_stages: ["requirement_review", stageId], recorded_at: recordedAt,
        },
      ];
      assistantContent = "";
    }

    requirement.review_gates.stages[stageId] = finalGate;
    requirement.review_gates.stages.requirement_review = requirement.review_gates.stages.requirement_review || fixedDemoAwaitingMaterialsReviewGates().stages.requirement_review;
    requirement.updated_at = now();
    conversation.review_gates = requirement.review_gates;
    conversation.workflow_status = "paused";
    conversation.generation_status = "completed";
    conversation.pending_stage = null;
    conversation.updated_at = now();
    const completedReport = remaining.length ? null : stageFile(requirement.id, 1, true);
    const assistantMessage = {
      id: makeId("msg"), role: "assistant", content: assistantContent, created_at: now(),
      activities: [], route: workflowRoute(requirement.id, true, 1), reasoning_summary: "",
      inline_material_validation: remaining.length > 0,
      stage_result: remaining.length ? null : fixedDemoStageResult(1, { version: "V1.1" }),
      artifacts: completedReport ? [messageArtifact(completedReport)] : [],
    };
    conversation.messages.push(assistantMessage);
    saveState();
    return sse([
      ["activity", { message: `正在分别校验 ${labels.length} 项补充内容` }],
      ["review_gate", checkingGate],
      ["review_gate", finalGate],
      ["complete", { message: assistantMessage }],
    ]);
  }

  function libraryCatalog(spaceId = "demo") {
    const tables = [
      { name: "dwd_demo_user_login_detail_di", display_name: "用户登录明细", workspace: "Demo", catalog: "dw", schema_name: "dm_demo", layer: "dwd", comment: "用户登录行为明细，按日分区", columns: [{ name: "user_id", type: "BIGINT", comment: "用户 ID" }, { name: "login_time", type: "TIMESTAMP", comment: "登录时间" }, { name: "ds", type: "STRING", comment: "业务日期" }] },
      { name: "dws_demo_active_user_1d", display_name: "用户日活汇总", workspace: "Demo", catalog: "dw", schema_name: "dm_demo", layer: "dws", comment: "按用户和日期汇总的活跃事实", columns: [{ name: "user_id", type: "BIGINT", comment: "用户 ID" }, { name: "active_cnt", type: "BIGINT", comment: "活跃次数" }, { name: "ds", type: "STRING", comment: "业务日期" }] },
      { name: "ads_demo_active_report_1d", display_name: "活跃用户日报", workspace: "Demo", catalog: "dw", schema_name: "dm_demo", layer: "ads", comment: "活跃用户多维分析报表", columns: [{ name: "active_user_cnt", type: "BIGINT", comment: "活跃用户数" }, { name: "channel_id", type: "STRING", comment: "渠道" }, { name: "ds", type: "STRING", comment: "业务日期" }] },
    ];
    const visibleBases = state.libraryBases.filter((base) => base.workspace_id === spaceId || base.global_access);
    const knowledge = visibleBases.map((base) => ({ ...base, files: clone(state.libraryFiles[base.id] || []) }));
    const scopedRequirements = state.requirements.filter((requirement) => (requirement.workspace_id || "demo") === spaceId);
    const requirements = scopedRequirements.map(({ files, review_gates, ...item }) => clone(item));
    const solutions = scopedRequirements.flatMap((requirement) => requirement.files.filter((file) => /model_design|data_development/.test(file.name)).map((file) => ({ id: `${requirement.id}:${file.name}`, name: file.display_name, file_name: file.name, requirement_id: requirement.id, requirement_title: requirement.title, updated_at: file.updated_at, content_url: file.content_url })));
    const sql = scopedRequirements.flatMap((requirement) => requirement.files.filter((file) => file.name.endsWith(".sql")).map((file) => ({ id: `${requirement.id}:${file.name}`, name: file.display_name, file_name: file.name, requirement_id: requirement.id, requirement_title: requirement.title, updated_at: file.updated_at, content_url: file.content_url })));
    return { tables: spaceId === "demo" ? tables : [], knowledge, requirements, solutions, sql };
  }

  function fileDetail(baseId, file) {
    return {
      file: clone(file),
      stage_outputs: [
        { key: "parse", content: `已解析 ${file.file_name}` },
        { key: "chunk", content: `已生成 ${file.chunk_count || 1} 个语义分块` },
        { key: "store", content: "已写入 Mock 浏览器知识库" },
      ],
    };
  }

  function knowledgeParityDefinitions() {
    const categoryGroups = {
      knowledge: "知识",
      agent_config: "Agent配置",
      system_settings: "系统设置",
    };
    const categoryGroupByCategory = {
      warehouse_standards: "knowledge",
      knowledge_assets: "knowledge",
      business_rules: "knowledge",
      knowledge_governance: "knowledge",
      workflow_prompts: "agent_config",
      agent_rules: "agent_config",
      platform_configuration: "system_settings",
    };
    const categories = {
      warehouse_standards: ["数仓规范", "建模、字段、SQL 与调度的强制规范", 10],
      knowledge_assets: ["业务知识库", "指标、维度、模板、函数、验证、数据源、性能与故障知识", 20],
      business_rules: ["平台能力与目录", "游戏域、生产资产、外部接口和自学习知识", 30],
      knowledge_governance: ["知识库治理", "存储介质、切片、检索和 Skill 接入规则", 40],
      workflow_prompts: ["工作流 Prompt", "六阶段及内部评审节点实际使用的 Prompt", 50],
      agent_rules: ["Agent 规则", "跨阶段通用行为与工具约束", 60],
      platform_configuration: ["平台配置", "运行时认证与服务连接", 70],
    };
    const rows = [
      ["sql_specs", "SQL 开发规范", "SQL 开发流程、代码结构和提交规则", "SQL规范.md", "warehouse_standards", 10, "运行时规范"],
      ["sql_writing_specs", "SQL 编写规范", "SQL 格式、语法和查询编写规则", "SQL编写规范.md", "warehouse_standards", 20, "运行时规范"],
      ["field_specs", "字段规范", "字段命名、类型、注释和空值规则", "字段规范.md", "warehouse_standards", 30, "运行时规范"],
      ["model_specs", "模型规范", "主题域、数仓分层、粒度和模型设计规则", "模型规范.md", "warehouse_standards", 40, "运行时规范"],
      ["scheduling_specs", "调度规范", "数据任务上线、DAG、发布、首次运行、补数和回滚规则", "调度规范.md", "warehouse_standards", 50, "运行时规范"],
      ["metric_catalog", "指标字典", "指标定义、公式、来源、粒度、过滤条件和生效范围", "metric_catalog.md", "knowledge_assets", 10, "知识契约"],
      ["knowledge_asset:dimension", "维度字典", "标准维度、别名、来源字段和枚举说明", "knowledge/assets/dimension", "knowledge_assets", 20, "可检索 68/68", "dimension"],
      ["etl_template_catalog", "ETL 模板库", "六类确定性 ETL 模板、适用条件、参数和 SQL 基线", "etl_template_catalog.md", "knowledge_assets", 30, "运行时模板索引"],
      ["knowledge_asset:udf", "UDF 目录", "业务自定义函数的签名、适用引擎、调用示例和注意事项", "knowledge/assets/udf", "knowledge_assets", 40, "可检索 71/71", "udf"],
      ["validation_policy", "数据验证规则库", "需求验收标准、默认校验项、测试表和 SQL 生成策略", "validation_policy.md", "knowledge_assets", 50, "3 类子项", "", "validation_rules"],
      ["knowledge_asset:data_source", "数据源文档", "表、字段、粒度和数据质量说明", "knowledge/assets/data_source", "knowledge_assets", 60, "可检索 9/9", "data_source"],
      ["knowledge_asset:performance", "性能优化知识库", "SQL 性能问题案例、识别信号和优化方案", "knowledge/assets/performance", "knowledge_assets", 70, "可检索 21/21", "performance"],
      ["fault_handbook", "故障处理手册", "调度、SQL、数据质量、资源与依赖故障的只读诊断和处置规则", "fault_handbook.md", "knowledge_assets", 80, "运行时故障知识"],
      ["tracking_retrieval", "历史埋点检索", "只读同步、物理事件定位、独立向量检索与 Phase 0 评测", "tracking/retrieval", "knowledge_assets", 90, "只读独立流程"],
      ["tracking_design", "埋点设计工作台", "策划案拆解、历史先例、事件级评审、门禁与冻结评审版", "tracking/designs", "knowledge_assets", 100, "Phase 1 独立流程"],
      ["user_library", "用户知识库", "上传业务文档，完成结构化学习后供 Agent 检索", "library/bases", "knowledge_assets", 110, "用户维护"],
      ["game_scope", "游戏与主题域映射", "游戏编码、业务名称和跨游戏隔离规则", "game_scope.md", "knowledge_assets", 5, "运行时知识规则"],
      ["smesser_agent_api", "元数据 Agent API", "统一签名、控制、Workflow、查询和元数据接口文档", "metadata_agent_api.md", "business_rules", 20, "外部接口文档"],
      ["production_asset_catalog", "生产资产目录", "在线增量同步 Project、Flow、Job 名称与归属关系", "production_asset_catalog.json", "business_rules", 30, "在线只读目录"],
      ["self_learning", "自学习知识", "用户确认过的偏好、禁止项和问题解决模式", "self_learning/records", "business_rules", 40, "已验证动态知识"],
      ["knowledge_governance", "知识存储与检索规范", "结构化存储、Markdown 投影、向量切片和运行时消费边界", "knowledge_governance.md", "knowledge_governance", 10, "运行时治理规范"],
      ["requirement_parse_prompt", "需求解析 Prompt", "提取需求事实、变更路由、验收标准和游戏范围", "01_requirement_parse_prompt.md", "workflow_prompts", 10, "7 个子项", "", "requirement_routes"],
      ["requirement_feasibility_prompt", "需求可行性评审 Prompt", "五项门禁、资产复用、影响范围和流转判定", "01_requirement_feasibility_prompt.md", "workflow_prompts", 20, "运行时 Prompt"],
      ["requirement_report_prompt", "需求评审报告 Prompt", "生成需求评审报告和数仓调研交接结论", "01_requirement_report_prompt.md", "workflow_prompts", 30, "运行时 Prompt"],
      ["warehouse_research_prompt", "数仓调研 Prompt", "检索真实元数据、FLOW、字段血缘和影响范围", "02_warehouse_research_prompt.md", "workflow_prompts", 40, "运行时 Prompt"],
      ["model_design_prompt", "模型设计 Prompt", "设计目标模型、字段口径、粒度、分区和加工链路", "03_model_design_prompt.md", "workflow_prompts", 50, "运行时 Prompt"],
      ["data_development_prompt", "数据开发 Prompt", "基于真实 FLOW 生成最小代码变更和开发交接", "04_data_development_prompt.md", "workflow_prompts", 60, "运行时 Prompt"],
      ["platform_development_prompt", "共享平台开发 Prompt", "知识库、向量检索和 Code Review 平台分支", "04_platform_development_prompt.md", "workflow_prompts", 70, "运行时 Prompt"],
      ["data_validation_prompt", "数据验证 Prompt", "根据验收标准和开发输出生成 ai_dw_test 验证 SQL", "05_data_validation_prompt.md", "workflow_prompts", 80, "运行时 Prompt"],
      ["paused_action_prompt", "暂停流程动作分类 Prompt", "识别暂停、重检、补证、重跑和取消动作", "00_paused_action_prompt.md", "workflow_prompts", 90, "运行时 Prompt"],
      ["prompts_skills", "Agent 通用规则", "Agent 提示规则、路由条件和工具约束", "prompts_skills.md", "agent_rules", 10, "运行时规则"],
      ["auth_settings", "认证设置", "模型、知识库、外部服务和数仓访问凭证", "auth/settings.json", "platform_configuration", 10, "密钥不回显"],
    ];
    return rows.map(([id, title, description, filename, category, itemOrder, typeLabel, assetLibraryId = "", hierarchy = ""]) => {
      const [categoryLabel, categoryDescription, categoryOrder] = categories[category];
      const categoryGroup = categoryGroupByCategory[category] || "knowledge";
      return { id, title, description, filename, category, category_label: categoryLabel, category_description: categoryDescription, category_order: categoryOrder, category_group: categoryGroup, category_group_label: categoryGroups[categoryGroup], item_order: itemOrder, type_label: typeLabel, runtime_bound: true, interactive: Boolean(assetLibraryId || hierarchy || ["auth_settings", "production_asset_catalog", "self_learning", "tracking_retrieval", "tracking_design", "user_library"].includes(id)), asset_library_id: assetLibraryId, hierarchy, exists: true };
    });
  }

  function ensureKnowledgeParity() {
    state.knowledge ||= [];
    const existing = new Map(state.knowledge.map((item) => [item.id, item]));
    const deletedCategories = new Set(state.deletedKnowledgeCategoryIds || []);
    const deletedDocuments = new Set(state.deletedKnowledgeDocumentIds || []);
    const customDocuments = state.knowledge.filter((item) => item.custom && !deletedCategories.has(item.category) && !deletedDocuments.has(item.id));
    const builtinDocuments = knowledgeParityDefinitions().filter((definition) => !deletedCategories.has(definition.category) && !deletedDocuments.has(definition.id)).map((definition) => {
      const stored = existing.get(definition.id);
      const content = stored?.content ?? `# ${definition.title}\n\n${definition.description}\n\n> Pages Mock 配置，仅在当前浏览器中保存。`;
      const modifiedAt = stored?.modified_at || now();
      const revisions = versionedKnowledgeDocumentIds.has(definition.id)
        ? (Array.isArray(stored?.revisions) && stored.revisions.length
          ? stored.revisions
          : [{ revision_id: "v1", version: 1, content_hash: contentHash(content), actor: "system", created_at: modifiedAt, summary: "初始版本", operation: "initial", restored_from: "", content }])
        : undefined;
      return { ...definition, content, modified_at: modifiedAt, ...(revisions ? { revisions } : {}) };
    });
    state.knowledge = [...builtinDocuments, ...customDocuments];
  }

  function ensureLibraryWorkspaceParity() {
    state.libraryBases ||= [];
    state.libraryFiles ||= {};
    state.libraryBases.forEach((base) => {
      base.workspace_id ||= "demo";
      base.global_access = base.workspace_id === "global";
      (state.libraryFiles[base.id] || []).forEach((file) => {
        file.workspace_id = base.workspace_id;
      });
    });
  }

  function defaultKnowledgeCategories() {
    return [
      { id: "warehouse_standards", label: "数仓规范", description: "建模、字段、SQL 与调度的强制规范", order: 10, icon: "blocks", builtin: true },
      { id: "knowledge_assets", label: "业务知识库", description: "指标、维度、模板、函数、验证、数据源、性能与故障知识", order: 20, icon: "book-open", builtin: true },
      { id: "workflow_prompts", label: "工作流 Prompt", description: "六阶段及内部评审节点实际使用的 Prompt", order: 30, icon: "messages-square", builtin: true },
    ];
  }

  function ensureKnowledgeCategoryParity() {
    state.deletedKnowledgeCategoryIds ||= [];
    state.deletedKnowledgeDocumentIds ||= [];
    if (!state.knowledgeCategoriesInitialized || !Array.isArray(state.knowledgeCategories)) {
      const deletedCategories = new Set(state.deletedKnowledgeCategoryIds);
      const stored = new Map((state.knowledgeCategories || []).map((category) => [category.id, category]));
      state.knowledgeCategories = defaultKnowledgeCategories()
        .filter((category) => !deletedCategories.has(category.id))
        .map((category) => ({ ...category, ...(stored.get(category.id) || {}) }));
      state.knowledgeCategoriesInitialized = true;
    }
    const categories = new Map(state.knowledgeCategories.map((category) => [category.id, category]));
    state.knowledge.forEach((item) => {
      const category = categories.get(item.category);
      if (!category) return;
      item.category_label = category.label;
      item.category_description = category.description;
      item.category_order = category.order;
    });
  }

  function knowledgeCategoryCatalog() {
    ensureKnowledgeCategoryParity();
    return state.knowledgeCategories
      .map((category) => ({ ...clone(category), count: state.knowledge.filter((item) => item.category === category.id).length }))
      .sort((left, right) => Number(left.order || 100) - Number(right.order || 100));
  }

  function ensureReferenceKnowledgeParity() {
    if (!knowledgeReference?.version || state.knowledge_reference_version === knowledgeReference.version) return;
    for (const item of state.knowledge) {
      const source = knowledgeReference.documents?.[item.id];
      if (!source) continue;
      item.content = source.content;
      item.modified_at = source.modified_at;
      if (versionedKnowledgeDocumentIds.has(item.id)) {
        item.revisions = [{
          revision_id: "v1", version: 1, content_hash: contentHash(source.content), actor: "system",
          created_at: source.modified_at, summary: "同步 devmagic 基线", operation: "initial",
          restored_from: "", content: source.content,
        }];
      }
    }
    state.referenceKnowledgeAssets = clone(knowledgeReference.assets || {});
    const authSections = knowledgeReference.interactive?.auth?.sections || [];
    if (authSections.length) {
      state.authSettings = Object.fromEntries(authSections.map((section) => [section.id, {
        title: section.title,
        description: section.description,
        fields: Object.fromEntries(section.fields.map((field) => [
          field.id,
          [field.label, Boolean(field.secret), Boolean(field.number), field.secret ? (field.configured ? "configured" : "") : field.value],
        ])),
      }]));
    }
    const routes = knowledgeReference.interactive?.routes?.items;
    if (Array.isArray(routes)) state.requirementRoutes = clone(routes);
    if (knowledgeReference.interactive?.validation) state.validationRules = clone(knowledgeReference.interactive.validation);
    state.knowledge_reference_version = knowledgeReference.version;
  }

  function referenceKnowledgeCatalog() {
    return state.knowledge.map(({ content, revisions, ...item }) => clone(item));
  }

  function publicKnowledgeDocument(item) {
    const { revisions, ...document } = item;
    return clone(document);
  }

  function publicKnowledgeRevision(revision) {
    const { content, ...metadata } = revision;
    return clone(metadata);
  }

  function knowledgeDocumentRevisions(item) {
    if (!item || (!versionedKnowledgeDocumentIds.has(item.id) && !item.custom)) return null;
    item.revisions ||= [];
    if (!item.revisions.length) {
      item.revisions.push({ revision_id: "v1", version: 1, content_hash: contentHash(item.content), actor: "system", created_at: item.modified_at || now(), summary: "初始版本", operation: "initial", restored_from: "", content: item.content });
    }
    return item.revisions;
  }

  function appendKnowledgeDocumentRevision(item, content, { actor, summary, operation, restoredFrom = "" }) {
    const revisions = knowledgeDocumentRevisions(item);
    const version = Math.max(0, ...revisions.map((revision) => Number(revision.version || 0))) + 1;
    const revision = {
      revision_id: `v${version}`, version, content_hash: contentHash(content), actor: actor || "system", created_at: now(),
      summary: String(summary || (operation === "restore" ? `恢复自 ${restoredFrom}` : "保存修改")),
      operation, restored_from: restoredFrom, content,
    };
    revisions.push(revision);
    return revision;
  }

  function referenceKnowledgeAssets(libraryId) {
    state.referenceKnowledgeAssets ||= {};
    if (!state.referenceKnowledgeAssets[libraryId]) {
      const isDataSource = libraryId === "data_source";
      const id = isDataSource ? "demo_login_detail" : `${libraryId}_example`;
      const title = isDataSource ? "Demo 登录明细数据源" : `${libraryId} Mock 知识条目`;
      const content = isDataSource
        ? JSON.stringify({ source_id: id, source_name: title, source_system: "Mock ETL", sync_method: "离线批处理", sync_frequency: "T+1", ods_table: "dm_demo.dwd_demo_user_login_detail_di", record_count_daily: "约 120 万", key_fields: [{ name: "user_id", type: "BIGINT", description: "用户 ID" }, { name: "ds", type: "STRING", description: "业务日期（分区字段）" }], data_quality_notes: "仅用于 Pages 演示，不连接生产数据。" }, null, 2)
        : `---\nlibrary_id: ${libraryId}\nasset_id: ${id}\n---\n# ${title}\n\n这是脱敏的 Mock 知识内容，用于演示在线编辑和学习流程。`;
      state.referenceKnowledgeAssets[libraryId] = [{
        id, library_id: libraryId, title, filename: isDataSource ? `${id}.json` : `${id}.md`, content,
        editor_format: isDataSource ? "json" : "markdown", version: 1, base_version: 1,
        base_hash: `mock-${id}`, dirty: false, vector_sync_status: "synced",
        source_collection: `${libraryId}_knowledge_chunks`, updated_at: now(),
      }];
    }
    return state.referenceKnowledgeAssets[libraryId];
  }

  function publicReferenceKnowledgeAsset(asset) {
    const { revisions, ...publicAsset } = asset;
    return clone(publicAsset);
  }

  function referenceKnowledgeAsset(libraryId, assetId) {
    return referenceKnowledgeAssets(libraryId).find((item) => item.id === assetId);
  }

  function referenceKnowledgeAssetRevisions(asset) {
    if (!asset) return null;
    asset.revisions ||= [];
    if (!asset.revisions.length) {
      asset.revisions.push({
        revision_id: "v1", version: 1, content_hash: contentHash(asset.content), actor: "system",
        created_at: asset.updated_at || now(), summary: "初始版本", operation: "initial",
        restored_from: "", content: String(asset.content || ""),
      });
    }
    return asset.revisions;
  }

  function appendReferenceKnowledgeAssetRevision(asset, content, { actor, summary, operation, restoredFrom = "" }) {
    const revisions = referenceKnowledgeAssetRevisions(asset);
    const version = Math.max(0, ...revisions.map((revision) => Number(revision.version || 0))) + 1;
    const revision = {
      revision_id: `v${version}`, version, content_hash: contentHash(content), actor: actor || "system", created_at: now(),
      summary: String(summary || (operation === "restore" ? `恢复自 ${restoredFrom}` : "保存修改")),
      operation, restored_from: restoredFrom, content,
    };
    revisions.push(revision);
    return revision;
  }

  function validationRuleCatalog() {
    if (!state.validationRules || state.validationRules.strategies?.length < 10) state.validationRules = {
      strategies: [
        { id: "default", title: "默认检查", description: "所有变更都必须覆盖的基础验证", required_operators: ["row_count_compare"] },
        { id: "dimension_add", title: "新增维度", description: "新增分析维度或维度字段", required_operators: ["row_count_compare", "join_amplification", "field_mapping_compare", "null_profile", "enum_profile"] },
        { id: "dimension_modify", title: "修改维度", description: "修改维度来源、映射或取值口径", required_operators: ["row_count_compare", "null_profile"] },
        { id: "metric_add", title: "新增指标", description: "新增聚合指标或指标字段", required_operators: ["row_count_compare", "null_profile", "aggregate_compare"] },
        { id: "metric_modify", title: "修改指标", description: "修改公式、过滤、时间窗口或去重口径", required_operators: ["row_count_compare", "aggregate_compare"] },
        { id: "field_add", title: "新增字段", description: "新增普通明细字段", required_operators: ["null_profile"] },
        { id: "field_modify", title: "修改字段", description: "修改字段来源或表达式", required_operators: ["null_profile"] },
        { id: "join_modify", title: "修改关联", description: "新增或修改 JOIN、关联键及来源表", required_operators: ["key_uniqueness", "join_amplification", "unmatched_rate", "field_mapping_compare", "aggregate_compare"] },
        { id: "filter_modify", title: "修改过滤", description: "新增或修改 WHERE、HAVING 过滤条件", required_operators: ["row_count_compare", "aggregate_compare"] },
        { id: "group_modify", title: "修改分组", description: "新增或修改 GROUP BY 粒度", required_operators: ["row_count_compare", "key_uniqueness", "aggregate_compare"] },
      ],
      operators: [
        { id: "row_count_compare", title: "行数对比", description: "比较同一输入快照下生产表与测试表的总体行数。", implementation: "stable_renderer", parameters: ["production_table", "test_table", "production_scope", "test_scope"] },
        { id: "key_uniqueness", title: "关联键唯一性", description: "检查来源表关联键是否存在重复，防止 JOIN 放大。", implementation: "stable_renderer", parameters: ["source_table", "source_scope", "key_expressions"] },
        { id: "join_amplification", title: "关联放大检测", description: "比较关联前后的行数，识别新增 JOIN 导致的数据膨胀。", implementation: "stable_renderer", parameters: ["production_table", "test_table", "production_scope", "test_scope"] },
        { id: "unmatched_rate", title: "关联未命中率", description: "统计新增关联的总量、未命中量和未命中率。", implementation: "stable_renderer", parameters: ["test_table", "source_table", "join_condition", "test_scope", "match_expression"] },
        { id: "field_mapping_compare", title: "字段映射一致性", description: "逐字段核对测试表结果与来源表达式是否一致。", implementation: "stable_renderer", parameters: ["test_table", "source_table", "target_field", "source_expression"] },
        { id: "null_profile", title: "空值画像", description: "统计新增或修改字段的空值数量和空值率。", implementation: "rule_template", parameters: ["table", "scope", "fields"] },
        { id: "enum_profile", title: "枚举合法性", description: "依据明确枚举证据检查非法值及其占比。", implementation: "rule_template", parameters: ["table", "scope", "field", "allowed_values"] },
        { id: "value_range", title: "值域检查", description: "依据明确边界检查字段值域和异常比例。", implementation: "rule_template", parameters: ["table", "scope", "field", "condition"] },
        { id: "aggregate_compare", title: "聚合指标对比", description: "比较新旧口径的聚合值或去重数量。", implementation: "stable_renderer", parameters: ["production_table", "test_table", "field"] },
        { id: "partition_continuity", title: "分区连续性", description: "回溯或补数场景下检查目标日期范围的分区是否完整。", implementation: "deterministic_check", parameters: ["table", "partition_field", "start_date", "end_date"] },
        { id: "manual_post_release", title: "发布后人工验收", description: "性能和自助分析体验等发布后人工验收项。", implementation: "manual", parameters: ["criterion", "owner", "completion_criteria"] },
      ],
      rules: [
        { id: "V001", title: "行数波动检测", description: "当前周期行数相对基准周期的变化率超过阈值时返回异常。", category: "volume", severity: "warning", engines: ["spark", "tez"], parameters: { table: {}, threshold_pct: {} }, template_sql: "SELECT COUNT(1) AS row_count FROM ${table} WHERE ${scope_predicate}" },
        { id: "V002", title: "主键唯一性检测", description: "组合主键出现重复时返回重复键样例。", category: "uniqueness", severity: "error", engines: ["spark", "tez"], parameters: { table: {}, primary_key_fields: {} }, template_sql: "SELECT ${primary_key_fields}, COUNT(1) FROM ${table} GROUP BY ${primary_key_fields} HAVING COUNT(1) > 1" },
        { id: "V003", title: "空值率检测", description: "字段空值占比超过阈值时返回异常。", category: "completeness", severity: "error", engines: ["spark", "tez"], parameters: { table: {}, check_field: {}, max_null_rate: {} }, template_sql: "SELECT COUNT_IF(${check_field} IS NULL) FROM ${table}" },
        { id: "V004", title: "值域校验", description: "字段值不满足显式边界时返回异常统计。", category: "validity", severity: "error", engines: ["spark", "tez"], parameters: { table: {}, check_field: {}, valid_condition: {} }, template_sql: "SELECT * FROM ${table} WHERE NOT (${valid_condition})" },
        { id: "V005", title: "枚举值合法性检测", description: "字段出现枚举集合之外的值时返回异常。", category: "validity", severity: "error", engines: ["spark", "tez"], parameters: { table: {}, check_field: {}, allowed_values_sql: {} }, template_sql: "SELECT ${check_field}, COUNT(1) FROM ${table} WHERE ${check_field} NOT IN (${allowed_values_sql}) GROUP BY ${check_field}" },
        { id: "V006", title: "日环比指标偏差检测", description: "指标在当前周期和基准周期之间变化超过阈值时返回异常。", category: "consistency", severity: "warning", engines: ["spark", "tez"], parameters: { table: {}, metric_expression: {}, threshold_pct: {} }, template_sql: "-- 比较当前周期与基准周期聚合结果" },
      ],
      updated_at: now(), source: "mock",
    };
    return state.validationRules;
  }

  function requirementRoutes() {
    if (!state.requirementRoutes || state.requirementRoutes.length < 6) state.requirementRoutes = [
      ["add", "新增需求", "ADD", "", "新增指标、维度、筛选器、报表或卡片"],
      ["modify", "修改需求", "MODIFY", "", "修改现有对象的口径、配置或展示"],
      ["delete", "删除需求", "DELETE", "", "识别删除意图但不执行删除操作"],
      ["a_to_b_reuse", "跨报表口径复用", "A_TO_B_REUSE", "", "按照 A 报表既有口径改造 B 报表"],
      ["metric_caliber_modify", "指标口径修改", "MODIFY", "METRIC_CALIBER_MODIFY", "修改公式、过滤、分子分母、Map Key 或回退顺序"],
      ["unknown", "无法识别", "UNKNOWN", "", "原文不足以判定新增、修改、删除或跨报表复用"],
    ].map(([id, title, parent_mode, subtype, description]) => ({
      id, title, route_key: subtype || parent_mode, parent_mode, subtype, description,
      filename: `routes/${id}.md`, content: `# ${title}\n\n## 命中条件\n\n${description}\n\n## 输出要求\n\n返回原文证据、对象类型、变更动作与置信度。`, modified_at: now(),
    }));
    return state.requirementRoutes;
  }

  function customSkills() {
    const seeds = [];
    const removedSeedIds = new Set(["platform-requirement-review", "platform-warehouse-research", "platform-data-validation", "custom-metric-audit", "custom-etl-checklist", "custom-lineage-brief", "custom-quality-plan"]);
    state.customSkills = (state.customSkills || []).filter((item) => !removedSeedIds.has(item.id));
    for (const seed of seeds) {
      if (!state.customSkills.some((item) => item.id === seed.id)) state.customSkills.push(seed);
    }
    state.skillFiles ||= {};
    for (const skill of state.customSkills) {
      const migratePublishedVersion = skill.published_sha256 === undefined && skill.publish_status === "published";
      skill.publish_status ||= "pending_publish";
      skill.owner ||= "demo.user";
      skill.enabled ??= true;
      if (migratePublishedVersion) skill.version = normalizeSkillVersion(skill.version || "v1.0.0");
      if (!state.skillFiles[skill.id]) {
        const capabilityText = (skill.required_capability_ids || []).map((item) => `- \`${item}\``).join("\n") || "- 无外部能力";
        state.skillFiles[skill.id] = [
          { path: "SKILL.md", content: `---\nname: ${skill.name || skill.id}\ndescription: ${skill.description}\n---\n\n# ${skill.title}\n\n## 使用场景\n\n${skill.description}\n\n## 执行步骤\n\n1. 校验输入与范围。\n2. 使用允许的平台能力收集证据。\n3. 生成结构化结果并标注不确定项。\n\n## 平台能力\n\n${capabilityText}\n` },
          { path: "references/output-contract.md", content: `# ${skill.title} 输出约定\n\n- 先返回结论，再列证据。\n- 不输出凭据或真实生产数据。\n- 无法确认的信息必须明确标记。\n` },
        ];
      }
      refreshSkillFiles(skill);
      skillVersions(skill).forEach((version) => { version.review_status ||= "approved"; });
      if (migratePublishedVersion) appendSkillVersion(skill, { version: skill.version, actor: "system", notes: "初始发布版本", reviewStatus: "approved" });
      else syncSkillPublishState(skill);
    }
    return state.customSkills;
  }

  function resolveSkillBindings(payload = {}, fallback = []) {
    const hasBindings = Array.isArray(payload.skill_bindings);
    const hasIds = Array.isArray(payload.skill_ids);
    const requested = hasBindings
      ? payload.skill_bindings
      : hasIds ? payload.skill_ids.map((skillId) => ({ skill_id: skillId, revision_id: "" })) : fallback;
    const bindings = [];
    const seen = new Set();
    for (const item of requested.slice(0, 10)) {
      const skillId = String(item?.skill_id || "");
      if (!skillId || seen.has(skillId)) continue;
      const skill = customSkills().find((entry) => entry.id === skillId);
      if (!skill || skill.enabled === false) continue;
      const approved = skillVersions(skill).filter((entry) => (entry.review_status || "approved") === "approved").slice().reverse();
      const version = approved.find((entry) => entry.revision_id === item.revision_id)
        || approved.find((entry) => entry.version === skill.version)
        || approved[0];
      if (!version) continue;
      bindings.push({ skill_id: skill.id, revision_id: version.revision_id, version: version.version });
      seen.add(skill.id);
    }
    return bindings;
  }

  function applyConversationSkillBindings(conversation, payload = {}, preserve = false) {
    const fallback = conversation.skill_bindings || (conversation.custom_skill_ids || []).map((skillId) => ({ skill_id: skillId, revision_id: "" }));
    const bindings = preserve && !Array.isArray(payload.skill_bindings) && !Array.isArray(payload.skill_ids)
      ? resolveSkillBindings({}, fallback)
      : resolveSkillBindings(payload, fallback);
    conversation.skill_bindings = bindings;
    conversation.custom_skill_ids = bindings.map((item) => item.skill_id);
    return bindings;
  }

  function mockSha(value) {
    let hash = 2166136261;
    const textValue = String(value || "");
    for (let index = 0; index < textValue.length; index += 1) {
      hash ^= textValue.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const unit = (hash >>> 0).toString(16).padStart(8, "0");
    return unit.repeat(8);
  }

  function refreshSkillFiles(skill) {
    const files = state.skillFiles?.[skill.id] || [];
    files.forEach((file) => {
      file.sha256 = mockSha(file.content);
      file.size = new TextEncoder().encode(String(file.content || "")).length;
      file.is_text = true;
      file.updated_at ||= skill.updated_at || now();
    });
    skill.file_count = files.length;
    skill.sha256 = mockSha(JSON.stringify({ name: skill.name, title: skill.title, description: skill.description, files: files.map((file) => [file.path, file.sha256]) }));
    return files;
  }

  function normalizeSkillVersion(value) {
    const match = String(value || "").match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/);
    return match ? `v${match[1]}.${match[2]}.${match[3] || 0}` : "v1.0.0";
  }

  function skillVersions(skill) {
    state.skillVersions ||= {};
    state.skillVersions[skill.id] ||= [];
    return state.skillVersions[skill.id];
  }

  function skillVersionChanges(files, previousFiles = []) {
    const previous = new Map(previousFiles.map((file) => [file.path, file]));
    const current = new Map(files.map((file) => [file.path, file]));
    const changes = files.filter((file) => previous.get(file.path)?.sha256 !== file.sha256).map((file) => ({
      path: file.path, sha256: file.sha256, size: file.size, change: previous.has(file.path) ? "modified" : "added",
      label: previous.has(file.path) ? "已修改" : "新增",
    }));
    previousFiles.filter((file) => !current.has(file.path)).forEach((file) => changes.push({ path: file.path, sha256: file.sha256, size: file.size, change: "deleted", label: "已删除" }));
    return changes;
  }

  function appendSkillVersion(skill, { version, actor, notes, reviewStatus = "approved", workspaceId = "", reviewer = "" }) {
    const versions = skillVersions(skill);
    const files = clone(refreshSkillFiles(skill));
    const previous = versions.slice().reverse().find((item) => (item.review_status || "approved") === "approved");
    const revision = {
      revision_id: makeId("skill-version"), version: normalizeSkillVersion(version), actor: actor || "system", created_at: now(),
      notes: String(notes || "发布 Skill"), name: skill.name, title: skill.title, description: skill.description,
      skill_sha256: skill.sha256, file_count: files.length, review_status: reviewStatus,
      workspace_id: workspaceId, reviewer,
      previous_revision_id: previous?.revision_id || "", reviewed_by: reviewStatus === "approved" ? actor || "system" : "",
      reviewed_at: reviewStatus === "approved" ? now() : "", review_reason: "",
      files, changes: skillVersionChanges(files, previous?.files || []),
    };
    versions.push(revision);
    if (reviewStatus === "approved") {
      skill.version = revision.version;
      skill.published_sha256 = revision.skill_sha256;
      skill.publish_status = "published";
      skill.last_review_status = "approved";
    } else {
      skill.pending_revision_id = revision.revision_id;
      skill.pending_version = revision.version;
      skill.publish_status = "reviewing";
      skill.last_review_status = "reviewing";
      skill.last_review_reason = "";
      skill.last_review_version = revision.version;
    }
    skill.updated_at = revision.created_at;
    return revision;
  }

  function syncSkillPublishState(skill) {
    if (skill.kind === "platform") { skill.publish_status = "published"; return; }
    const pending = skillVersions(skill).find((version) => version.revision_id === skill.pending_revision_id && version.review_status === "reviewing");
    if (pending) { skill.publish_status = "reviewing"; skill.pending_version = pending.version; return; }
    skill.publish_status = skill.published_sha256 && skill.published_sha256 === skill.sha256 ? "published" : "pending_publish";
  }

  function publicSkillVersion(version) {
    return clone({
      revision_id: version.revision_id, version: version.version, actor: version.actor, created_at: version.created_at,
      notes: version.notes, name: version.name, title: version.title, description: version.description,
      skill_sha256: version.skill_sha256, file_count: version.file_count,
      review_status: version.review_status || "approved", reviewed_by: version.reviewed_by || "", reviewed_at: version.reviewed_at || "",
      workspace_id: version.workspace_id || "", reviewer: version.reviewer || "",
      review_reason: version.review_reason || "", previous_revision_id: version.previous_revision_id || "",
      files: version.files.map(({ content, updated_at, is_text, ...file }) => file), changes: version.changes,
    });
  }

  function detailedSkillVersion(version, previous) {
    const metadataFields = [["title", "显示标题"], ["name", "Skill 标识"], ["description", "描述"]];
    return {
      ...publicSkillVersion(version),
      previous_version: previous?.version || "",
      files: clone(version.files || []),
      previous_files: clone(previous?.files || []),
      metadata_changes: previous ? metadataFields.filter(([field]) => previous[field] !== version[field]).map(([field, label]) => ({ field, label, previous: previous[field] || "", current: version[field] || "" })) : [],
    };
  }

  function findSkillReview(revisionId) {
    for (const skill of customSkills()) {
      const versions = skillVersions(skill);
      const version = versions.find((item) => item.revision_id === revisionId);
      if (!version) continue;
      const previous = versions.find((item) => item.revision_id === version.previous_revision_id) || null;
      return { skill, version, previous };
    }
    return null;
  }

  function publicSkillReview(skill, version) {
    return {
      ...publicSkillVersion(version), skill_id: skill.id, skill_name: skill.name, skill_title: skill.title,
      owner: skill.owner || "-", review_status: version.review_status || "approved",
    };
  }

  function skillFileRevisions(skill, file) {
    if (!skill || !file) return null;
    state.skillFileRevisions ||= {};
    const key = `${skill.id}:${file.path}`;
    state.skillFileRevisions[key] ||= [];
    if (!state.skillFileRevisions[key].length) {
      state.skillFileRevisions[key].push({
        revision_id: "v1", version: 1, content_hash: contentHash(file.content), actor: "system",
        created_at: file.updated_at || skill.updated_at || now(), summary: "初始版本", operation: "initial", restored_from: "", content: file.content || "",
      });
    }
    return state.skillFileRevisions[key];
  }

  function appendSkillFileRevision(skill, file, { actor, summary, operation, restoredFrom = "" }) {
    const revisions = skillFileRevisions(skill, file);
    const version = Math.max(0, ...revisions.map((revision) => Number(revision.version || 0))) + 1;
    const revision = {
      revision_id: `v${version}`, version, content_hash: contentHash(file.content), actor: actor || "system", created_at: now(),
      summary: String(summary || (operation === "restore" ? `恢复自 ${restoredFrom}` : "保存文件")),
      operation, restored_from: restoredFrom, content: file.content || "",
    };
    revisions.push(revision);
    return revision;
  }

  function publicSkillFileRevision(revision) {
    const { content, ...metadata } = revision;
    return clone(metadata);
  }

  function skillCapabilities() {
    return [
      ["knowledge_search", "知识检索", "从已授权知识库检索业务事实与规则"],
      ["document_read", "文档读取", "读取需求文档和已上传附件"],
      ["asset_search", "资产搜索", "搜索表、指标、任务和数据源资产"],
      ["metadata_query", "元数据查询", "查询表字段、分区和生命周期"],
      ["lineage_query", "血缘查询", "查询表级与字段级上下游血缘"],
      ["sql_analyze", "SQL 分析", "静态分析 SQL 结构、风险和规范"],
      ["sql_generate", "SQL 生成", "基于已确认口径生成 SQL 草案"],
      ["validation_rules", "验证规则", "读取和渲染稳定验证算子"],
      ["scheduler_query", "调度查询", "只读查询任务依赖和调度配置"],
      ["model_design", "模型设计", "生成模型粒度、主键与字段映射"],
      ["code_diff", "代码 Diff", "生成文件级和行级代码差异"],
      ["artifact_write", "产物写入", "写入当前需求的本地流程产物"],
      ["conversation_context", "对话上下文", "读取当前对话已确认的上下文"],
      ["requirement_state", "需求状态", "读取当前需求和阶段门禁状态"],
      ["notification_preview", "通知预览", "生成通知卡片预览但不实际发送"],
    ].map(([id, title, description]) => ({ id, title, description, available: true }));
  }

  function engineeringSkills() {
    const stages = [
      ["requirement_review", "需求评审"], ["warehouse_research", "数仓调研"], ["model_design", "模型设计"],
      ["data_development", "数据开发"], ["data_validation", "数据验证"],
    ];
    state.engineeringSkills ||= stages.map(([stage_id, stage_title]) => ({
      stage_id, stage_title, binding_version: 0, lock_version: 0, active_version_id: "", active_version_label: "",
      versions: [], tests: [], change_request: null, history: [],
    }));
    return state.engineeringSkills;
  }

  function engineeringStage(stageId) {
    return engineeringSkills().find((item) => item.stage_id === stageId);
  }

  function selfLearningRecords() {
    state.selfLearning ||= [{
      id: "learn-mock001", type: "preference", title: "优先展示口径与验收结论",
      instruction: "回答数仓需求时先给出口径、粒度和验收结论，再展示实现细节。",
      negative_instruction: "不要引用生产凭据或真实用户数据。", status: "active", version: 1,
      scope: { level: "instance", requirement_id: "", game: "", stage: "", objects: [] },
      source: { conversation_id: "chat-demo-requirement", message_ids: ["msg-demo-assistant"] },
      validation: { reason: "Mock 演示记录" }, updated_at: now(),
    }];
    return state.selfLearning;
  }

  function authSettings() {
    state.authSettings ||= {
      openai: { title: "Demo Gateway", description: "OpenAI Responses 网关", fields: { model: ["模型", false, false, "gpt-5.6-sol"], base_url: ["网关地址", false, false, "https://gateway.example.test/v1"], api_key: ["Demo Gateway API Key", true, false, "mock-secret"] } },
      claude: { title: "Claude", description: "Demo Anthropic Gateway", fields: { model: ["模型", false, false, "anthropic/claude-sonnet"], base_url: ["网关地址", false, false, "https://gateway.example.test"], auth_token: ["Gateway Token", true, false, "mock-secret"] } },
      embedding: { title: "Embedding", description: "知识向量化服务", fields: { model: ["模型", false, false, "text-embedding-3-small"], api_url: ["接口地址", false, false, "https://embedding.example.test/v1"], api_key: ["API Key", true, false, "mock-secret"] } },
      feishu: { title: "文档服务", description: "需求文档读取（Demo）", fields: { app_id: ["App ID", false, false, "mock_app_id"], app_secret: ["App Secret", true, false, "mock-secret"] } },
      smesser_agent: { title: "元数据服务", description: "生产元数据与 Flow/Job 只读查询（Demo）", fields: { host: ["服务地址", false, false, "https://metadata.example.test"], platform_user: ["平台用户", false, false, "dw-agent"], username: ["业务用户", false, false, "demo.user"], secret_key: ["Secret Key", true, false, "mock-secret"] } },
      magic_api: { title: "分析报表服务", description: "自助分析报表与物理表血缘只读查询（Demo）", fields: { host: ["服务地址", false, false, "https://analytics.example.test"], site: ["站点", false, false, "data_warehouse"], token: ["Token", true, false, "mock-secret"] } },
      mysql: { title: "MySQL", description: "结构化知识库", fields: { host: ["Host", false, false, "mysql.example.test"], port: ["Port", false, true, 3306], user: ["User", false, false, "report"], database: ["Database", false, false, "dw_agent_demo"], password: ["Password", true, false, "mock-secret"] } },
      milvus: { title: "Milvus", description: "向量知识库", fields: { host: ["Host", false, false, "milvus.example.test"], port: ["Port", false, true, 19530], token: ["Token", true, false, "mock-secret"] } },
      warehouse: { title: "数仓查询", description: "Trino/Tez 只读查询 SSO", fields: { service_url: ["查询服务", false, false, "https://warehouse.example.test/query"], user_key: ["SSO User Key", true, false, "mock-secret"] } },
    };
    return state.authSettings;
  }

  function publicAuthSettings() {
    return { sections: Object.entries(authSettings()).filter(([id]) => id === "openai").map(([id, section]) => ({
      id, title: section.title, description: section.description,
      fields: Object.entries(section.fields).map(([fieldId, field]) => ({ id: fieldId, label: field[0], secret: field[1], number: field[2], readonly: fieldId === "base_url", configured: field[1] ? Boolean(field[3]) : String(field[3] ?? "") !== "", value: field[1] ? "" : field[3] })),
      configured: Object.values(section.fields).every((field) => String(field[3] ?? "") !== ""),
    })) };
  }

  function trackingEvents() {
    state.trackingEvents ||= [
      { id: "event-level-start", app: "demo", event_name: "level_start", event_title: "关卡开始", description: "玩家进入关卡并完成资源初始化", source_path: "Demo / 关卡核心 / level_start", parameters: ["level_id", "level_type", "entry_source"], updated_at: now() },
      { id: "event-level-fail", app: "demo", event_name: "level_fail", event_title: "关卡失败", description: "玩家未完成关卡，记录失败原因与剩余步数", source_path: "Demo / 关卡核心 / level_fail", parameters: ["level_id", "fail_reason", "left_step"], updated_at: now() },
      { id: "event-prop-use", app: "demo", event_name: "prop_use", event_title: "道具使用", description: "玩家在局内或局外使用道具", source_path: "Demo / 道具系统 / prop_use", parameters: ["prop_id", "use_scene", "quantity"], updated_at: now() },
      { id: "event-guide-step", app: "demo", event_name: "guide_step", event_title: "新手引导步骤", description: "记录新手引导步骤曝光与完成状态", source_path: "Demo / 新手引导 / guide_step", parameters: ["guide_id", "step_id", "step_status"], updated_at: now() },
    ];
    return state.trackingEvents;
  }

  function trackingGoldenQueries() {
    state.trackingGoldenQueries ||= [
      { id: "golden-fail", query: "关卡失败原因", expected_event_names: ["level_fail"], reviewer: "demo.reviewer", version: "v1", created_at: now() },
      { id: "golden-prop", query: "局内道具消耗", expected_event_names: ["prop_use"], reviewer: "demo.reviewer", version: "v1", created_at: now() },
    ];
    return state.trackingGoldenQueries;
  }

  function trackingEvaluation() {
    state.trackingEvaluation ||= { id: "eval-phase0", precision_at_5: 1, recall_at_10: 1, mrr: 1, passed: true, query_count: trackingGoldenQueries().length, evaluated_at: now(), thresholds: { precision_at_5: 0.8, recall_at_10: 0.9, mrr: 0.8 } };
    return state.trackingEvaluation;
  }

  function trackingDesigns() {
    state.trackingDesigns ||= [{
      id: "design-guide", title: "新手引导流程埋点设计", requirement_id: "REQ-TRACK-001", app: "demo", owner: "demo.user", summary: "覆盖引导曝光、步骤交互、完成与中断路径，并复用已有 guide_step 物理事件。", status: "reviewing", version: 1, updated_at: now(),
      events: [
        { id: "design-event-guide", event_name: "guide_step", event_title: "新手引导步骤", description: "复用历史事件并补充步骤状态", parameters: ["guide_id", "step_id", "step_status"], review_status: "approved" },
        { id: "design-event-exit", event_name: "guide_exit", event_title: "新手引导退出", description: "新增退出事件，区分主动关闭与异常中断", parameters: ["guide_id", "step_id", "exit_reason"], review_status: "pending" },
      ], revisions: [{ version: 1, status: "reviewing", created_at: now() }],
    }];
    return state.trackingDesigns;
  }

  async function handleApi(input, options = {}) {
    const requestUrl = new URL(typeof input === "string" ? input : input.url, window.location.href);
    const path = requestUrl.pathname;
    const method = String(options.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (!path.startsWith("/api/")) return nativeFetch(input, options);
    const body = ["POST", "PUT", "PATCH"].includes(method) ? await requestBody(input, options) : {};
    const account = requestAccount(options);

    if (path === "/api/status" && method === "GET") {
      return json({
        status: "ok",
        platform_version: "v1.0.0",
        available_versions: [
          { id: "v1.0.0", label: "v1.0.0", port: 443 },
        ],
        model: "gpt-5.6-sol",
        reasoning_effort: "high",
        configured: true,
        orchestration: "mock",
      });
    }
    if (path === "/api/models" && method === "GET") return json({ models: [{ id: "gpt-5.6-sol" }, { id: "claude-sonnet-5" }], default_model: "gpt-5.6-sol", source: "mock" });
    if (path === "/api/quick-tasks" && method === "GET") return json([
      { id: "indicator_lineage", label: "指标与血缘查询", description: "查询指标口径、上下游表和生产 FLOW" },
      { id: "data_source", label: "数据源探查", description: "按游戏域定位表、字段和真实来源" },
      { id: "udf", label: "UDF 生成", description: "生成 Hive 或 Spark UDF" },
      { id: "etl_template", label: "ETL 模板生成", description: "按数仓规范生成新增任务代码" },
      { id: "validation_sql", label: "数据验证 SQL", description: "根据验收标准和默认规则生成 SQL" },
      { id: "sql_review", label: "SQL 规范检查", description: "检查正确性、性能和安全风险" },
    ]);

    if (path === "/api/account/me" && method === "GET") return json(clone(state.users.find((user) => user.username === account) || state.users[0]));
    if (path === "/api/account/accounts" && method === "GET") return json(clone(state.users));
    if (path === "/api/account/switch" && method === "POST") {
      const user = state.users.find((item) => item.username === body.username);
      if (!user) return error("用户不存在", 404);
      state.selectedAccount = user.username;
      saveState();
      return json(clone(user));
    }

    if (path === "/api/spaces" && method === "GET") {
      const user = state.users.find((item) => item.username === account) || state.users[0];
      return json(clone(user.role === "admin" ? state.spaces : state.spaces.filter((space) => user.space_ids.includes(space.id))));
    }
    const reviewerMatch = path.match(/^\/api\/spaces\/([^/]+)\/reviewers$/);
    if (reviewerMatch && method === "GET") {
      const spaceId = decodeURIComponent(reviewerMatch[1]);
      const actor = state.users.find((user) => user.username === account) || state.users[0];
      if (actor.role !== "admin" && !actor.space_ids.includes(spaceId)) return error("无权访问该工作空间", 403);
      return json(clone(state.users.filter((user) => user.role === "admin" || user.space_ids.includes(spaceId))));
    }
    if (path === "/api/spaces" && method === "POST") {
      const name = String(body.name || "").trim();
      if (!name) return error("请输入空间名称");
      const item = { id: makeId("space"), name, icon: name.slice(0, 2).toUpperCase(), color: "#e2e8f0", is_default: false, created_by: account, created_at: now() };
      state.spaces.push(item);
      saveState();
      return json(clone(item));
    }
    let match = path.match(/^\/api\/spaces\/([^/]+)$/);
    if (match && method === "PATCH") {
      const item = state.spaces.find((space) => space.id === decodeURIComponent(match[1]));
      if (!item) return error("工作空间不存在", 404);
      item.name = String(body.name || item.name).trim();
      item.icon = item.name.slice(0, 2).toUpperCase();
      saveState();
      return json(clone(item));
    }
    if (match && method === "DELETE") {
      const id = decodeURIComponent(match[1]);
      state.spaces = state.spaces.filter((space) => space.id !== id);
      saveState();
      return json({ success: true, space_id: id });
    }

    if (path === "/api/users" && method === "GET") return json(clone(state.users));
    if (path === "/api/roles" && method === "GET") return json({ roles: clone(state.roles), modules: clone(roleModules) });
    if (path === "/api/roles" && method === "POST") {
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const moduleIds = [...new Set(Array.isArray(body.module_ids) ? body.module_ids.map(String) : [])];
      if (!name) return error("请输入角色名称");
      if (!moduleIds.length) return error("请至少选择一个功能模块");
      if (state.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) return error(`角色 '${name}' 已存在`, 400);
      const item = { id: makeId("role"), name, description, module_ids: moduleIds, module_count: moduleIds.length, is_builtin: false, created_at: now() };
      state.roles.push(item);
      saveState();
      return json(clone(item));
    }
    let roleMatch = path.match(/^\/api\/roles\/([^/]+)$/);
    if (roleMatch && method === "PATCH") {
      const role = state.roles.find((item) => item.id === decodeURIComponent(roleMatch[1]));
      if (!role) return error("角色不存在", 404);
      const name = String(body.name || role.name).trim();
      const description = String(body.description || "").trim();
      const moduleIds = [...new Set(Array.isArray(body.module_ids) ? body.module_ids.map(String) : role.module_ids)];
      if (!name) return error("请输入角色名称");
      if (!moduleIds.length) return error("请至少选择一个功能模块");
      if (state.roles.some((item) => item.id !== role.id && item.name.toLowerCase() === name.toLowerCase())) return error(`角色 '${name}' 已存在`, 400);
      Object.assign(role, { name, description, module_ids: moduleIds, module_count: moduleIds.length });
      state.users.forEach((user) => { if (user.role === role.id) user.role_label = role.name; });
      saveState();
      return json(clone(role));
    }

    if (path === "/api/users" && method === "POST") {
      const username = String(body.username || "").trim();
      if (!username) return error("请输入用户名称");
      const selectedRole = state.roles.find((role) => role.id === (body.role || "dw_engineer"));
      const item = { username, role: body.role || "dw_engineer", role_label: selectedRole?.name || roleLabels[body.role] || "数仓工程师", space_ids: body.space_ids || ["demo"], created_at: now() };
      state.users.push(item);
      saveState();
      return json(clone(item));
    }
    match = path.match(/^\/api\/users\/([^/]+)$/);
    if (match && method === "PATCH") {
      const user = state.users.find((item) => item.username === decodeURIComponent(match[1]));
      if (!user) return error("用户不存在", 404);
      user.role = body.role || user.role;
      user.role_label = state.roles.find((role) => role.id === user.role)?.name || roleLabels[user.role] || user.role;
      user.space_ids = body.space_ids || user.space_ids;
      saveState();
      return json(clone(user));
    }
    if (match && method === "DELETE") {
      const username = decodeURIComponent(match[1]);
      state.users = state.users.filter((user) => user.username !== username || username === state.selectedAccount);
      saveState();
      return json({ success: true, username });
    }

    if (path === "/api/notifications/settings" && method === "GET") return json(clone(state.notificationSettings));
    if (path === "/api/notifications/settings" && method === "PUT") {
      state.notificationSettings = { ...state.notificationSettings, ...body, app_configured: false };
      saveState();
      return json(clone(state.notificationSettings));
    }
    if (path === "/api/notifications/chats" && method === "GET") return json([]);
    if (path === "/api/notifications/members" && method === "GET") return json(state.users.map((user) => ({ open_id: `mock-${user.username}`, name: user.username })));
    if (path === "/api/notifications/deliveries" && method === "GET") return json(clone(state.deliveries));
    if (path === "/api/notifications/test" && method === "POST") return error("Mock 环境不会发送真实飞书通知", 400);
    if (/^\/api\/notifications\/deliveries\/[^/]+\/retry$/.test(path) && method === "POST") return error("Mock 环境没有可重试的真实通知", 400);

    if (path === "/api/audit" && method === "GET") {
      const actor = state.users.find((user) => user.username === account) || state.users[0];
      if (actor.role !== "admin") return error("请联系管理员", 403);
      const records = state.conversations.map((conversation) => ({
        id: `audit-${conversation.id}`,
        task_label: conversation.task_label || conversation.intent_label || "消息生成",
        session_id: conversation.id,
        created_at: conversation.updated_at || now(),
        status: conversation.generation_status || conversation.workflow_status || "completed",
      }));
      return json({ total: records.length, records });
    }

    if (path === "/api/knowledge" && method === "GET") return json(referenceKnowledgeCatalog());
    if (path === "/api/knowledge" && method === "POST") {
      ensureKnowledgeCategoryParity();
      const title = String(body.title || "").trim();
      const description = String(body.description || "").trim();
      const categoryId = String(body.category || "");
      const organizationType = String(body.organization_type || "single_page");
      const initialContent = String(body.initial_content || "");
      const sourceFilename = String(body.source_filename || "").trim();
      const sourceFilenames = Array.isArray(body.source_filenames) ? body.source_filenames.map((name) => String(name).trim()).filter(Boolean) : [];
      const category = state.knowledgeCategories.find((item) => item.id === categoryId);
      if (!title) return error("请输入知识名称", 422);
      if (title.length > 80) return error("知识名称不能超过 80 个字符", 422);
      if (description.length > 200) return error("知识描述不能超过 200 个字符", 422);
      if (!["single_page", "directory"].includes(organizationType)) return error("内容组织方式无效", 422);
      if (initialContent.length > 1000000) return error("Markdown 内容不能超过 1000000 个字符", 422);
      if (sourceFilename.length > 255) return error("文件名不能超过 255 个字符", 422);
      if (sourceFilenames.length > 50) return error("目录型文档最多支持 50 个文件", 422);
      if (sourceFilenames.some((name) => name.length > 255)) return error("文件名不能超过 255 个字符", 422);
      if (organizationType === "single_page" && sourceFilenames.length > 1) return error("单篇文档最多支持 1 个文件", 422);
      if (!category) return error("所属分类不存在", 422);
      if (state.knowledge.some((item) => item.category === categoryId && String(item.title).toLowerCase() === title.toLowerCase())) return error("该分类下已存在同名知识", 409);
      const id = `custom:${makeId("knowledge")}`;
      const createdAt = now();
      const item = {
        id, title, description, filename: `custom/${id.slice(7)}.md`, content: initialContent || `# ${title}\n`,
        category: category.id, category_label: category.label, category_description: category.description,
        category_order: category.order, category_group: "knowledge", category_group_label: "知识",
        category_group_order: 10, item_order: Math.max(0, ...state.knowledge.filter((entry) => entry.category === categoryId).map((entry) => Number(entry.item_order || 0))) + 1,
        type_label: organizationType === "directory" ? "目录型文档" : "单篇文档", organization_type: organizationType, source_filename: sourceFilename, source_filenames: sourceFilenames,
        runtime_bound: false, custom: true, exists: true,
        created_at: createdAt, created_by: account, modified_at: createdAt, revisions: [],
      };
      knowledgeDocumentRevisions(item);
      state.knowledge.push(item);
      saveState();
      return json(publicKnowledgeDocument(item), 201);
    }
    if (path === "/api/knowledge/categories" && method === "GET") return json(knowledgeCategoryCatalog());
    if (path === "/api/knowledge/categories" && method === "POST") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const label = String(body.label || "").trim();
      if (!label) return error("请输入分类名称", 422);
      if (label.length > 30) return error("分类名称不能超过 30 个字符", 422);
      if (state.knowledgeCategories.some((category) => category.label.toLowerCase() === label.toLowerCase())) return error("分类名称已存在", 409);
      const category = {
        id: makeId("knowledge-category"), label, description: "自定义知识分类",
        order: Math.max(0, ...state.knowledgeCategories.map((item) => Number(item.order || 0))) + 10,
        icon: "folder", builtin: false,
      };
      state.knowledgeCategories.push(category);
      saveState();
      return json({ ...clone(category), count: 0 }, 201);
    }
    match = path.match(/^\/api\/knowledge\/categories\/([^/]+)$/);
    if (match && method === "PATCH") {
      const categoryId = decodeURIComponent(match[1]);
      const category = state.knowledgeCategories.find((item) => item.id === categoryId);
      if (!category) return error("知识分类不存在", 404);
      const label = String(body.label || "").trim();
      if (!label) return error("请输入分类名称", 422);
      if (label.length > 30) return error("分类名称不能超过 30 个字符", 422);
      if (state.knowledgeCategories.some((item) => item.id !== categoryId && item.label.toLowerCase() === label.toLowerCase())) return error("分类名称已存在", 409);
      category.label = label;
      state.knowledge.filter((item) => item.category === categoryId).forEach((item) => { item.category_label = label; });
      saveState();
      return json({ ...clone(category), count: state.knowledge.filter((item) => item.category === categoryId).length });
    }
    if (match && method === "DELETE") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const categoryId = decodeURIComponent(match[1]);
      const categoryIndex = state.knowledgeCategories.findIndex((item) => item.id === categoryId);
      if (categoryIndex < 0) return error("知识分类不存在", 404);
      const [category] = state.knowledgeCategories.splice(categoryIndex, 1);
      const removedCount = state.knowledge.filter((item) => item.category === categoryId).length;
      state.knowledge = state.knowledge.filter((item) => item.category !== categoryId);
      if (category.builtin && !state.deletedKnowledgeCategoryIds.includes(categoryId)) state.deletedKnowledgeCategoryIds.push(categoryId);
      saveState();
      return json({ success: true, id: categoryId, removed_count: removedCount });
    }
    if (path === "/api/auth-settings" && method === "GET") return json(publicAuthSettings());
    if (path === "/api/auth-settings" && method === "PUT") {
      Object.entries(body.sections || {}).forEach(([sectionId, fields]) => {
        const section = authSettings()[sectionId];
        if (!section) return;
        Object.entries(fields || {}).forEach(([fieldId, value]) => {
          if (!section.fields[fieldId] || String(value) === "") return;
          section.fields[fieldId][3] = section.fields[fieldId][2] ? Number(value) : String(value);
        });
      });
      saveState();
      return json(publicAuthSettings());
    }
    match = path.match(/^\/api\/knowledge\/([^/]+)$/);
    if (match && method === "GET") {
      const item = state.knowledge.find((document) => document.id === decodeURIComponent(match[1]));
      return item ? json(publicKnowledgeDocument(item)) : error("配置文档不存在", 404);
    }
    if (match && method === "PUT") {
      const item = state.knowledge.find((document) => document.id === decodeURIComponent(match[1]));
      if (!item) return error("配置文档不存在", 404);
      const content = String(body.content || "");
      let revision = null;
      if (versionedKnowledgeDocumentIds.has(item.id) || item.custom) {
        const revisions = knowledgeDocumentRevisions(item);
        if (item.content !== content) revision = appendKnowledgeDocumentRevision(item, content, { actor: account, summary: body.summary, operation: "save" });
        else revision = revisions[revisions.length - 1];
      }
      const unchanged = item.content === content;
      item.content = content;
      item.modified_at = now();
      saveState();
      return json({ ...publicKnowledgeDocument(item), ...(revision ? { revision: publicKnowledgeRevision(revision), unchanged } : {}) });
    }
    if (match && method === "DELETE") {
      const documentId = decodeURIComponent(match[1]);
      state.deletedKnowledgeDocumentIds ||= [];
      const index = state.knowledge.findIndex((document) => document.id === documentId);
      if (index < 0) return error("配置文档不存在", 404);
      const [item] = state.knowledge.splice(index, 1);
      if (knowledgeParityDefinitions().some((definition) => definition.id === documentId) && !state.deletedKnowledgeDocumentIds.includes(documentId)) {
        state.deletedKnowledgeDocumentIds.push(documentId);
      }
      saveState();
      return json({ id: documentId, title: item.title, deleted: true, deleted_by: account });
    }
    match = path.match(/^\/api\/knowledge\/([^/]+)\/revisions$/);
    if (match && method === "GET") {
      const item = state.knowledge.find((document) => document.id === decodeURIComponent(match[1]));
      const revisions = knowledgeDocumentRevisions(item);
      if (!revisions) return error("此知识文档尚未启用版本记录");
      const currentRevision = revisions[revisions.length - 1]?.revision_id || "";
      return json({
        items: revisions.slice().reverse().map((revision) => ({ ...publicKnowledgeRevision(revision), is_current: revision.revision_id === currentRevision })),
        total: revisions.length,
        current_revision: currentRevision,
      });
    }
    match = path.match(/^\/api\/knowledge\/([^/]+)\/revisions\/([^/]+)$/);
    if (match && method === "GET") {
      const item = state.knowledge.find((document) => document.id === decodeURIComponent(match[1]));
      const revisions = knowledgeDocumentRevisions(item);
      if (!revisions) return error("此知识文档尚未启用版本记录");
      const revision = revisions.find((entry) => entry.revision_id === decodeURIComponent(match[2]));
      return revision ? json({ ...clone(revision), is_current: revision === revisions[revisions.length - 1] }) : error("知识版本不存在", 404);
    }
    match = path.match(/^\/api\/knowledge\/([^/]+)\/revisions\/([^/]+)\/restore$/);
    if (match && method === "POST") {
      const item = state.knowledge.find((document) => document.id === decodeURIComponent(match[1]));
      const revisions = knowledgeDocumentRevisions(item);
      if (!revisions) return error("此知识文档尚未启用版本记录");
      const source = revisions.find((entry) => entry.revision_id === decodeURIComponent(match[2]));
      if (!source) return error("知识版本不存在", 404);
      item.content = source.content;
      item.modified_at = now();
      const revision = appendKnowledgeDocumentRevision(item, source.content, { actor: account, summary: body.summary, operation: "restore", restoredFrom: source.revision_id });
      saveState();
      const { content: _content, ...metadata } = revision;
      return json({ ...publicKnowledgeDocument(item), revision: clone(metadata) });
    }
    if (path === "/api/admin/skill-reviews" && method === "GET") {
      const actor = state.users.find((user) => user.username === account);
      if (!actor) return error("用户不存在", 403);
      const status = requestUrl.searchParams.get("status") || "reviewing";
      const reviews = customSkills().flatMap((skill) => skillVersions(skill).map((version) => publicSkillReview(skill, version)))
        .filter((item) => actor.role === "admin" || item.reviewer === account)
        .filter((item) => status === "processed" ? ["approved", "rejected"].includes(item.review_status) : item.review_status === status)
        .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
      return json({ items: reviews, total: reviews.length });
    }
    match = path.match(/^\/api\/admin\/skill-reviews\/([^/]+)$/);
    if (match && method === "GET") {
      const actor = state.users.find((user) => user.username === account);
      const found = findSkillReview(decodeURIComponent(match[1]));
      if (!found) return error("审核申请不存在", 404);
      if (actor?.role !== "admin" && found.version.reviewer !== account) return error("该发布申请未指派给当前用户", 403);
      return json({ ...detailedSkillVersion(found.version, found.previous), skill_id: found.skill.id, skill_name: found.skill.name, skill_title: found.skill.title, owner: found.skill.owner || "-" });
    }
    match = path.match(/^\/api\/admin\/skill-reviews\/([^/]+)\/(approve|reject)$/);
    if (match && method === "POST") {
      const actor = state.users.find((user) => user.username === account);
      const found = findSkillReview(decodeURIComponent(match[1]));
      if (!found) return error("审核申请不存在", 404);
      if (actor?.role !== "admin" && found.version.reviewer !== account) return error("该发布申请未指派给当前用户", 403);
      if (found.version.review_status !== "reviewing") return error("该申请已处理", 409);
      const decision = match[2];
      const reason = decision === "reject" ? String(body.reason || "").trim() : "";
      if (decision === "reject" && !reason) return error("请填写驳回原因", 422);
      found.version.reviewed_by = account;
      found.version.reviewed_at = now();
      found.skill.pending_revision_id = "";
      found.skill.pending_version = "";
      found.skill.updated_at = found.version.reviewed_at;
      if (decision === "approve") {
        found.version.review_status = "approved";
        found.version.review_reason = "";
        found.skill.version = found.version.version;
        found.skill.published_sha256 = found.version.skill_sha256;
        found.skill.last_review_status = "approved";
        found.skill.last_review_reason = "";
      } else {
        found.version.review_status = "rejected";
        found.version.review_reason = reason;
        found.skill.last_review_status = "rejected";
        found.skill.last_review_reason = reason;
        found.skill.last_review_version = found.version.version;
      }
      syncSkillPublishState(found.skill);
      saveState();
      return json({ skill: clone(found.skill), review: publicSkillReview(found.skill, found.version) });
    }

    if (path === "/api/custom-skills" && method === "GET") return json(clone(customSkills()));
    if (path === "/api/custom-skills" && method === "POST") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const name = String(body.name || `custom-skill-${Date.now().toString(36)}`).trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return error("Skill 标识只能使用小写字母、数字和连字符", 422);
      if (customSkills().some((item) => item.name === name)) return error("Skill 标识已存在", 409);
      const skill = {
        id: makeId("skill"), name, title: String(body.title || "未命名 Skill"),
        description: String(body.description || "描述这个 Skill 解决的问题"), kind: "custom",
        publish_status: "pending_publish", published_sha256: "", owner: "demo.user", version: "", enabled: true,
        compatibility_status: "ready", compatibility_summary: "Pages Mock 安全校验通过",
        required_capability_ids: [], required_capabilities: [], created_at: now(), updated_at: now(),
      };
      customSkills().push(skill);
      state.skillFiles[skill.id] = Array.isArray(body.files) && body.files.length
        ? body.files.map((file) => ({ path: String(file.path || "SKILL.md"), content: String(file.content || file.data || ""), updated_at: now() }))
        : [{ path: "SKILL.md", content: `---\nname: ${name}\ndescription: ${skill.description}\n---\n\n# ${skill.title}\n`, updated_at: now() }];
      refreshSkillFiles(skill);
      saveState();
      return json(clone(skill));
    }
    if (path === "/api/custom-skills/import" && method === "POST") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const files = Array.isArray(body.files) ? body.files : [];
      if (!files.length || files.length > 200) return error("Skill 文件数量无效", 422);
      const normalized = [];
      let totalBytes = 0;
      for (const file of files) {
        const filePath = String(file.path || "").replaceAll("\\", "/").replace(/^\/+/, "");
        if (!filePath || filePath.split("/").includes("..")) return error("Skill 包包含不安全路径", 422);
        const content = String(file.data || "");
        const size = new TextEncoder().encode(content).length;
        if (size > 2 * 1024 * 1024) return error(`${filePath} 超过 2 MB`, 422);
        totalBytes += size;
        normalized.push({ path: filePath, content, updated_at: now() });
      }
      if (totalBytes > 4 * 1024 * 1024) return error("Skill 包超过 4 MB", 422);
      if (normalized.filter((file) => file.path === "SKILL.md").length !== 1) return error("必须且只能包含一个根目录 SKILL.md", 422);
      const manifest = normalized.find((file) => file.path === "SKILL.md").content;
      const frontmatter = manifest.match(/^---\s*\n([\s\S]*?)\n---/);
      const frontmatterValue = (key) => frontmatter?.[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^['"]|['"]$/g, "") || "";
      let name = frontmatterValue("name") || String(body.filename || "imported-skill").replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `imported-${Date.now().toString(36)}`;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) name = `imported-${Date.now().toString(36)}`;
      if (customSkills().some((item) => item.name === name)) name = `${name}-${Date.now().toString(36).slice(-4)}`;
      const title = manifest.match(/^#\s+(.+)$/m)?.[1]?.trim() || name.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
      const description = frontmatterValue("description") || "从本地文件导入的 Skill";
      const required = skillCapabilities().filter((capability) => manifest.includes(capability.id)).map((capability) => capability.id);
      const suspicious = /(?:curl\s+[^\n]*\|\s*(?:sh|bash)|rm\s+-rf|eval\s*\(|child_process|os\.system)/i.test(manifest);
      const skill = {
        id: makeId("skill"), name, title, description, kind: "custom", publish_status: "pending_publish", published_sha256: "",
        owner: "demo.user", version: "", enabled: true, created_at: now(), updated_at: now(),
        compatibility_status: suspicious ? "review" : "ready",
        compatibility_summary: suspicious ? "检测到需人工复核的命令模式" : "Pages Mock 安全校验通过",
        required_capability_ids: required, required_capabilities: required,
      };
      customSkills().push(skill); state.skillFiles[skill.id] = normalized; refreshSkillFiles(skill); saveState();
      return json(clone(skill));
    }
    match = path.match(/^\/api\/custom-skills\/([^/]+)\/enabled$/);
    if (match && method === "PATCH") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      if (typeof body.enabled !== "boolean") return error("enabled 必须是布尔值", 422);
      const id = decodeURIComponent(match[1]);
      const skill = customSkills().find((item) => item.id === id);
      if (!skill) return error("Skill 不存在", 404);
      skill.enabled = body.enabled;
      skill.updated_at = now();
      if (!skill.enabled) state.conversations.forEach((conversation) => {
        conversation.custom_skill_ids = (conversation.custom_skill_ids || []).filter((skillId) => skillId !== id);
        conversation.skill_bindings = (conversation.skill_bindings || []).filter((binding) => binding.skill_id !== id);
      });
      saveState();
      return json(clone(skill));
    }
    match = path.match(/^\/api\/custom-skills\/([^/]+)$/);
    if (match && method === "DELETE") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const id = decodeURIComponent(match[1]);
      const skill = customSkills().find((item) => item.id === id);
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 不可删除", 403);
      state.customSkills = customSkills().filter((item) => item.id !== id);
      delete state.skillFiles[id];
      delete state.skillVersions?.[id];
      for (const key of Object.keys(state.skillFileRevisions || {})) {
        if (key.startsWith(`${id}:`)) delete state.skillFileRevisions[key];
      }
      state.conversations.forEach((conversation) => {
        conversation.custom_skill_ids = (conversation.custom_skill_ids || []).filter((skillId) => skillId !== id);
        conversation.skill_bindings = (conversation.skill_bindings || []).filter((binding) => binding.skill_id !== id);
      });
      saveState();
      return json({ id, deleted: true });
    }

    if (path === "/api/skill-capabilities" && method === "GET") return json({ items: clone(skillCapabilities()) });
    match = path.match(/^\/api\/skills\/([^/]+)\/metadata$/);
    if (match && method === "PATCH") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 为只读", 403);
      if (body.base_sha256 !== skill.sha256) return error("Skill 已被其他操作更新，请刷新后重试", 409);
      const name = String(body.name || "").trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return error("Skill 标识格式不正确", 422);
      if (customSkills().some((item) => item.id !== skill.id && item.name === name)) return error("Skill 标识已存在", 409);
      Object.assign(skill, { name, title: String(body.title || "").trim(), description: String(body.description || "").trim(), updated_at: now() });
      const manifest = state.skillFiles[skill.id]?.find((file) => file.path === "SKILL.md");
      if (manifest) {
        const previousContent = manifest.content;
        skillFileRevisions(skill, manifest);
        if (/^---\s*\n[\s\S]*?\n---/.test(manifest.content)) manifest.content = manifest.content.replace(/^---\s*\n[\s\S]*?\n---/, `---\nname: ${skill.name}\ndescription: ${skill.description}\n---`);
        else manifest.content = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${manifest.content}`;
        manifest.updated_at = now();
        if (manifest.content !== previousContent) appendSkillFileRevision(skill, manifest, { actor: account, summary: "更新基本信息", operation: "save" });
      }
      refreshSkillFiles(skill); syncSkillPublishState(skill); saveState(); return json(clone(skill));
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/files$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      return json({ items: clone(refreshSkillFiles(skill).map(({ content, ...file }) => file)), sha256: skill.sha256 });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/export$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      return json({ filename: `${skill.name || skill.id}.zip`, skill: clone(skill), files: clone(refreshSkillFiles(skill)) });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/versions$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      const versions = skillVersions(skill).slice().reverse().map(publicSkillVersion);
      return json({ items: versions, total: versions.length, published_version: skill.version || "" });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/versions\/([^/]+)$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      const versions = skillVersions(skill);
      const index = versions.findIndex((item) => item.revision_id === decodeURIComponent(match[2]));
      if (index < 0) return error("Skill 版本不存在", 404);
      const previous = versions.find((item) => item.revision_id === versions[index].previous_revision_id) || null;
      return json(detailedSkillVersion(versions[index], previous));
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/publish$/);
    if (match && method === "POST") {
      if (!state.users.some((user) => user.username === account)) return error("用户不存在", 403);
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 为只读", 403);
      refreshSkillFiles(skill);
      if (body.base_sha256 !== skill.sha256) return error("Skill 草稿已变化，请刷新后重试", 409);
      if (skill.publish_status === "published") return error("当前草稿与已发布版本一致", 409);
      if (skill.publish_status === "reviewing") return error("已有发布申请正在审核中", 409);
      const version = normalizeSkillVersion(body.version);
      if (!/^v\d+\.\d+\.\d+$/.test(String(body.version || "").startsWith("v") ? body.version : `v${body.version}`)) return error("版本号格式应为 v1.0.0", 422);
      if (skillVersions(skill).some((item) => item.version === version && item.review_status !== "rejected")) return error("该版本号已存在发布或审核记录", 409);
      const workspaceId = String(body.space_id || "demo");
      const reviewer = String(body.reviewer || account);
      const reviewerUser = state.users.find((user) => user.username === reviewer);
      if (!reviewerUser || (reviewerUser.role !== "admin" && !reviewerUser.space_ids.includes(workspaceId))) return error("审核人无权访问当前工作空间", 422);
      const release = appendSkillVersion(skill, { version, actor: account, notes: body.notes, reviewStatus: "reviewing", workspaceId, reviewer });
      saveState(); return json({ skill: clone(skill), release: publicSkillVersion(release) });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/versions\/([^/]+)\/restore$/);
    if (match && method === "POST") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 为只读", 403);
      refreshSkillFiles(skill);
      if (body.base_sha256 !== skill.sha256) return error("Skill 草稿已变化，请刷新后重试", 409);
      const source = skillVersions(skill).find((item) => item.revision_id === decodeURIComponent(match[2]));
      if (!source) return error("Skill 版本不存在", 404);
      Object.assign(skill, { name: source.name, title: source.title, description: source.description, updated_at: now() });
      state.skillFiles[skill.id] = source.files.map((file) => ({ path: file.path, content: file.content, updated_at: now() }));
      refreshSkillFiles(skill); syncSkillPublishState(skill); saveState();
      return json({ skill: clone(skill), files: clone(state.skillFiles[skill.id].map(({ content, ...file }) => file)) });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/file-revisions\/([^/]+)$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      const file = refreshSkillFiles(skill).find((item) => item.path === decodeURIComponent(match[2]));
      if (!file) return error("Skill 文件不存在", 404);
      const revisions = skillFileRevisions(skill, file);
      const currentRevision = revisions.at(-1)?.revision_id || "";
      return json({
        items: revisions.slice().reverse().map((revision) => ({ ...publicSkillFileRevision(revision), is_current: revision.revision_id === currentRevision })),
        total: revisions.length, current_revision: currentRevision,
      });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/file-revisions\/([^/]+)\/([^/]+)$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      const file = refreshSkillFiles(skill).find((item) => item.path === decodeURIComponent(match[2]));
      if (!file) return error("Skill 文件不存在", 404);
      const revisions = skillFileRevisions(skill, file);
      const revision = revisions.find((item) => item.revision_id === decodeURIComponent(match[3]));
      return revision ? json({ ...clone(revision), is_current: revision === revisions.at(-1) }) : error("文件版本不存在", 404);
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/file-revisions\/([^/]+)\/([^/]+)\/restore$/);
    if (match && method === "POST") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 为只读", 403);
      const file = refreshSkillFiles(skill).find((item) => item.path === decodeURIComponent(match[2]));
      if (!file) return error("Skill 文件不存在", 404);
      const revisions = skillFileRevisions(skill, file);
      const source = revisions.find((item) => item.revision_id === decodeURIComponent(match[3]));
      if (!source) return error("文件版本不存在", 404);
      file.content = source.content; file.updated_at = now(); skill.updated_at = now();
      appendSkillFileRevision(skill, file, { actor: account, summary: body.summary, operation: "restore", restoredFrom: source.revision_id });
      refreshSkillFiles(skill); syncSkillPublishState(skill); saveState();
      return json(clone({ ...file, skill_sha256: skill.sha256, publish_status: skill.publish_status }));
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/files\/(.+)$/);
    if (match && method === "GET") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      const filePath = decodeURIComponent(match[2]);
      const file = refreshSkillFiles(skill).find((item) => item.path === filePath);
      return file ? json(clone(file)) : error("Skill 文件不存在", 404);
    }
    if (match && method === "PUT") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 为只读", 403);
      const filePath = decodeURIComponent(match[2]);
      if (filePath.split("/").includes("..")) return error("文件路径不安全", 422);
      let file = refreshSkillFiles(skill).find((item) => item.path === filePath);
      if (file && body.base_sha256 !== file.sha256) return error("文件已被其他操作更新，请刷新后重试", 409);
      if (!file && body.base_sha256 !== "0".repeat(64)) return error("新文件基线版本无效", 409);
      const existed = Boolean(file);
      const previousContent = file?.content || "";
      if (file) skillFileRevisions(skill, file);
      if (!file) { file = { path: filePath }; state.skillFiles[skill.id].push(file); }
      file.content = String(body.content || ""); file.updated_at = now(); skill.updated_at = now();
      if (!existed) skillFileRevisions(skill, file);
      else if (file.content !== previousContent) appendSkillFileRevision(skill, file, { actor: account, summary: body.summary, operation: "save" });
      refreshSkillFiles(skill); syncSkillPublishState(skill); saveState();
      return json(clone({ ...file, skill_sha256: skill.sha256, publish_status: skill.publish_status }));
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/adapt-preview$/);
    if (match && method === "POST") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (body.base_sha256 !== skill.sha256) return error("Skill 版本已变化", 409);
      const content = refreshSkillFiles(skill).map((file) => file.content).join("\n");
      const matches = skillCapabilities().filter((capability) => content.includes(capability.id) || content.toLowerCase().includes(capability.title.toLowerCase())).map((capability) => ({ source: capability.title, capability_id: capability.id, reason: "在 Skill 文件中发现对应调用或语义" }));
      return json({ summary: matches.length ? `识别到 ${matches.length} 项可适配平台能力` : "未发现需要适配的工具调用", matches });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/adapt$/);
    if (match && method === "POST") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      if (skill.kind === "platform") return error("平台 Skill 为只读", 403);
      if (body.base_sha256 !== skill.sha256) return error("Skill 版本已变化", 409);
      const content = refreshSkillFiles(skill).map((file) => file.content).join("\n");
      skill.required_capability_ids = skillCapabilities().filter((capability) => content.includes(capability.id) || content.includes(capability.title)).map((capability) => capability.id);
      skill.required_capabilities = skill.required_capability_ids; skill.compatibility_status = "ready"; skill.compatibility_summary = "平台能力适配完成"; skill.updated_at = now(); refreshSkillFiles(skill); saveState();
      return json({ skill: clone(skill), adapted: true });
    }
    match = path.match(/^\/api\/skills\/([^/]+)\/edit-suggestions$/);
    if (match && method === "POST") {
      const skill = customSkills().find((item) => item.id === decodeURIComponent(match[1]));
      if (!skill) return error("Skill 不存在", 404);
      const file = refreshSkillFiles(skill).find((item) => item.path === body.path);
      if (!file) return error("Skill 文件不存在", 404);
      if (body.base_sha256 !== file.sha256) return error("文件已被更新，请刷新后重试", 409);
      const draft = String(body.draft_content || file.content || "");
      const instruction = String(body.instruction || "补充说明").trim();
      const addition = body.path.endsWith(".md") ? `\n\n## 修改说明\n\n- ${instruction}\n- 执行前校验输入，失败时返回明确原因。\n` : `\n// ${instruction}\n`;
      const proposed = draft.replace(/\s*$/, "") + addition;
      return json({ summary: `根据“${instruction.slice(0, 40)}”生成 1 处修改`, proposed_content: proposed, diff: [
        ...draft.split("\n").slice(-3).map((textValue) => ({ type: "context", text: textValue })),
        ...addition.trimStart().split("\n").map((textValue) => ({ type: "add", text: textValue })),
      ] });
    }

    if (path === "/api/engineering/skills" && method === "GET") return json({ stages: clone(engineeringSkills()) });
    if (path === "/api/engineering/skills/versions" && method === "POST") {
      const stage = engineeringStage(String(body.stage_id || ""));
      const skill = customSkills().find((item) => item.id === body.skill_id);
      if (!stage || !skill) return error("阶段或 Skill 不存在", 404);
      const version = { id: makeId("skill-version"), label: `v1.${stage.versions.length + 1}`, skill_id: skill.id, skill_title: skill.title, implementation_key: String(body.implementation_key || ""), manifest: body.manifest || {}, created_at: now() };
      stage.versions.push(version); saveState(); return json(clone(version));
    }
    match = path.match(/^\/api\/engineering\/skills\/([^/]+)\/tests$/);
    if (match && method === "POST") {
      const stage = engineeringStage(decodeURIComponent(match[1]));
      if (!stage || !stage.versions.some((item) => item.id === body.skill_version_id)) return error("候选版本不存在", 404);
      const test = { id: makeId("golden-test"), skill_version_id: body.skill_version_id, golden_case_ref: String(body.golden_case_ref || ""), result: body.result, evidence: body.evidence || {}, created_at: now() };
      stage.tests.push(test); saveState(); return json(clone(test));
    }
    match = path.match(/^\/api\/engineering\/skills\/([^/]+)\/change-requests$/);
    if (match && method === "POST") {
      const stage = engineeringStage(decodeURIComponent(match[1]));
      if (!stage || !stage.versions.some((item) => item.id === body.skill_version_id)) return error("候选版本不存在", 404);
      if (!stage.tests.some((item) => item.skill_version_id === body.skill_version_id && item.result === "passed")) return error("申请启用前必须有通过的 Golden Case", 409);
      stage.change_request = { id: makeId("change-request"), skill_version_id: body.skill_version_id, reason: String(body.reason || ""), status: "pending", created_at: now() };
      saveState(); return json(clone(stage.change_request));
    }
    match = path.match(/^\/api\/engineering\/skills\/change-requests\/([^/]+)\/review$/);
    if (match && method === "POST") {
      const stage = engineeringSkills().find((item) => item.change_request?.id === decodeURIComponent(match[1]));
      if (!stage) return error("变更申请不存在", 404);
      stage.change_request.status = body.approved ? "approved" : "rejected"; stage.change_request.review_comment = String(body.comment || ""); stage.change_request.reviewed_at = now();
      saveState(); return json(clone(stage.change_request));
    }
    match = path.match(/^\/api\/engineering\/skills\/change-requests\/([^/]+)\/apply$/);
    if (match && method === "POST") {
      const stage = engineeringSkills().find((item) => item.change_request?.id === decodeURIComponent(match[1]));
      if (!stage) return error("变更申请不存在", 404);
      if (stage.change_request.status !== "approved") return error("变更申请尚未批准", 409);
      if (Number(body.lock_version) !== stage.lock_version) return error("Registry 已被更新，请刷新后重试", 409);
      const version = stage.versions.find((item) => item.id === stage.change_request.skill_version_id);
      if (!version) return error("候选版本不存在", 404);
      stage.active_version_id = version.id; stage.active_version_label = version.label; stage.binding_version += 1; stage.lock_version += 1;
      stage.history.unshift({ id: makeId("history"), version_id: version.id, version_label: version.label, action: "apply", action_label: "启用", created_at: now() });
      stage.change_request.status = "applied"; saveState(); return json(clone(stage));
    }
    match = path.match(/^\/api\/engineering\/skills\/([^/]+)\/rollback$/);
    if (match && method === "POST") {
      const stage = engineeringStage(decodeURIComponent(match[1]));
      if (!stage) return error("阶段不存在", 404);
      if (Number(body.lock_version) !== stage.lock_version) return error("Registry 已被更新，请刷新后重试", 409);
      const history = stage.history.find((item) => item.id === body.history_id);
      if (!history) return error("历史版本不存在", 404);
      const previousLabel = stage.active_version_label; stage.active_version_id = history.version_id; stage.active_version_label = history.version_label; stage.binding_version += 1; stage.lock_version += 1;
      stage.history.unshift({ id: makeId("history"), version_id: history.version_id, version_label: history.version_label, action: "rollback", action_label: `从 ${previousLabel || "未绑定"} 回滚`, reason: String(body.reason || ""), created_at: now() });
      saveState(); return json(clone(stage));
    }

    if (path === "/api/performance/retrieval" && method === "GET") return json({
      definition: "至少命中一条有效结果的召回请求数 / 已完成召回请求总数",
      success_rate: 92.3, observation_count: 13, covered_requirement_count: 5,
      skipped_count: 2, hit_count: 12, request_count: 13, empty_count: 1, error_count: 0,
      sources: [
        { source: "mock_metric_catalog", label: "指标口径", success_rate: 100, hit_count: 6, empty_count: 0, error_count: 0 },
        { source: "mock_table_catalog", label: "表与字段", success_rate: 85.7, hit_count: 6, empty_count: 1, error_count: 0 },
      ],
    });

    if (path === "/api/validation-rules" && method === "GET") return json(clone(validationRuleCatalog()));
    match = path.match(/^\/api\/validation-rules\/strategies\/([^/]+)$/);
    if (match && method === "PUT") {
      const strategy = validationRuleCatalog().strategies.find((item) => item.id === decodeURIComponent(match[1]));
      if (!strategy) return error("验证策略不存在", 404);
      strategy.required_operators = Array.isArray(body.required_operators) ? body.required_operators : [];
      state.validationRules.updated_at = now();
      saveState();
      return json(clone(strategy));
    }

    if (path === "/api/requirement-routes" && method === "GET") return json({
      title: "需求解析 Prompt", description: "Mock 通用解析合同与需求意图路由",
      parent_modes: ["ADD", "MODIFY", "DELETE", "A_TO_B_REUSE", "UNKNOWN"], items: clone(requirementRoutes()),
    });
    if (path === "/api/requirement-routes" && method === "POST") {
      const route = {
        id: makeId("route"), title: String(body.title || "新需求路由"), route_key: String(body.route_key || "UNKNOWN"),
        parent_mode: String(body.parent_mode || "UNKNOWN"), subtype: "自定义路由",
        description: String(body.description || ""), filename: `routes/${String(body.route_key || "custom").toLowerCase()}.md`,
        content: `# ${String(body.title || "新需求路由")}\n\n${String(body.description || "请填写路由规则。")}`, modified_at: now(),
      };
      requirementRoutes().push(route);
      saveState();
      return json(clone(route));
    }
    match = path.match(/^\/api\/requirement-routes\/([^/]+)$/);
    if (match && method === "GET") {
      const route = requirementRoutes().find((item) => item.id === decodeURIComponent(match[1]));
      return route ? json(clone(route)) : error("需求路由不存在", 404);
    }
    if (match && method === "PUT") {
      const route = requirementRoutes().find((item) => item.id === decodeURIComponent(match[1]));
      if (!route) return error("需求路由不存在", 404);
      route.content = String(body.content || "");
      route.modified_at = now();
      saveState();
      return json(clone(route));
    }

    if (path === "/api/production-assets/status" && method === "GET") return json({
      configured: true, running: false, phase: "completed", message: "Mock 资产目录已就绪", synced_at: now(),
      counts: { projects: 2, flows: 3, jobs: 5, detailed_projects: 2, detailed_flows: 3 },
      remote_totals: { projects: 2, flows: 3 },
      progress: { jobs_synced: 5, job_total: 5, job_percent: 100 },
    });
    if (path === "/api/production-assets/sync" && method === "POST") return json({
      configured: true, running: false, phase: "completed", message: "Mock 同步完成", synced_at: now(),
      counts: { projects: 2, flows: 3, jobs: 5, detailed_projects: 2, detailed_flows: 3 },
      remote_totals: { projects: 2, flows: 3 }, progress: { jobs_synced: 5, job_total: 5, job_percent: 100 },
    });
    if (path === "/api/production-assets/search" && method === "GET") {
      const query = String(requestUrl.searchParams.get("q") || "").toLowerCase();
      const assets = [
        { type: "project", name: "Demo 数仓", path: "projects/demo_dw", score: 3, details_synced_at: now() },
        { type: "flow", name: "活跃用户日汇总", path: "Demo 数仓 / 活跃用户日汇总", score: 4, details_synced_at: now() },
        { type: "job", name: "dws_demo_active_user_1d", path: "Demo 数仓 / 活跃用户日汇总 / dws_demo_active_user_1d", score: 5, details_synced_at: now() },
      ];
      return json({ evidence_notice: "仅展示脱敏 Mock 名称与关系，不连接生产平台", results: assets.filter((item) => !query || `${item.name} ${item.path}`.toLowerCase().includes(query)) });
    }

    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/batch\/status$/);
    if (match && method === "GET") {
      const items = referenceKnowledgeAssets(decodeURIComponent(match[1]));
      return json({ running: false, phase: "completed", message: "Mock 学习已完成", total: items.length, eligible: 0, processed: items.length, succeeded: items.length, failed: 0, skipped: 0, current_asset_id: "" });
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/batch\/learn$/);
    if (match && method === "POST") {
      const items = referenceKnowledgeAssets(decodeURIComponent(match[1]));
      items.forEach((item) => {
        item.dirty = false; item.vector_sync_status = "synced"; item.content_hash = contentHash(item.content);
      });
      saveState();
      return json({ running: false, phase: "completed", message: "整体学习已完成", total: items.length, eligible: 0, processed: items.length, succeeded: items.length, failed: 0, skipped: 0, current_asset_id: "" });
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)$/);
    if (match && method === "GET") {
      const items = referenceKnowledgeAssets(decodeURIComponent(match[1]));
      const query = String(requestUrl.searchParams.get("q") || "").toLowerCase();
      return json({ items: items.filter((item) => !query || `${item.title} ${item.id}`.toLowerCase().includes(query)).map(publicReferenceKnowledgeAsset), total: items.length });
    }
    if (match && method === "POST") {
      const libraryId = decodeURIComponent(match[1]);
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const title = String(body.title || "").trim();
      const importedContent = String(body.content || "");
      const sourceFilename = String(body.source_filename || "").trim();
      const sourceType = String(body.source_type || "local_upload");
      if (!title) return error("请输入条目名称", 422);
      if (title.length > 80) return error("条目名称不能超过 80 个字符", 422);
      if (importedContent.length > 1000000) return error("本地文件内容不能超过 1000000 个字符", 422);
      if (sourceFilename.length > 255) return error("文件名不能超过 255 个字符", 422);
      const items = referenceKnowledgeAssets(libraryId);
      if (items.some((item) => item.title.toLowerCase() === title.toLowerCase())) return error("条目名称已存在", 409);
      const id = makeId(libraryId);
      const isDataSource = libraryId === "data_source";
      const importedJson = sourceFilename.toLowerCase().endsWith(".json");
      const editorFormat = sourceFilename ? (importedJson ? "json" : "markdown") : (isDataSource ? "json" : "markdown");
      const content = importedContent || (isDataSource
        ? JSON.stringify({ source_id: id, source_name: title, source_system: "", sync_method: "", sync_frequency: "", ods_table: "", key_fields: [] }, null, 2)
        : `---\nlibrary_id: ${libraryId}\nasset_id: ${id}\n---\n\n# ${title}\n`);
      const asset = { id, library_id: libraryId, title, filename: `${id}.${editorFormat === "json" ? "json" : "md"}`, content, editor_format: editorFormat, source_type: sourceType, source_filename: sourceFilename, version: 1, base_version: 1, base_hash: `mock-${id}`, dirty: true, vector_sync_status: "pending", source_collection: `${libraryId}_knowledge_chunks`, updated_at: now(), message: "条目已创建，等待学习" };
      referenceKnowledgeAssets(libraryId).push(asset);
      saveState();
      return json(publicReferenceKnowledgeAsset(asset), 201);
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/([^/]+)\/revisions$/);
    if (match && method === "GET") {
      const asset = referenceKnowledgeAsset(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      if (!asset) return error("知识条目不存在", 404);
      const revisions = referenceKnowledgeAssetRevisions(asset);
      const currentRevision = revisions[revisions.length - 1]?.revision_id || "";
      saveState();
      return json({
        items: revisions.slice().reverse().map((revision) => ({ ...publicKnowledgeRevision(revision), is_current: revision.revision_id === currentRevision })),
        total: revisions.length,
        current_revision: currentRevision,
      });
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/([^/]+)\/revisions\/([^/]+)$/);
    if (match && method === "GET") {
      const asset = referenceKnowledgeAsset(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      if (!asset) return error("知识条目不存在", 404);
      const revisions = referenceKnowledgeAssetRevisions(asset);
      const revision = revisions.find((entry) => entry.revision_id === decodeURIComponent(match[3]));
      return revision ? json({ ...clone(revision), is_current: revision === revisions[revisions.length - 1] }) : error("知识版本不存在", 404);
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/([^/]+)\/revisions\/([^/]+)\/restore$/);
    if (match && method === "POST") {
      const asset = referenceKnowledgeAsset(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      if (!asset) return error("知识条目不存在", 404);
      const revisions = referenceKnowledgeAssetRevisions(asset);
      const source = revisions.find((entry) => entry.revision_id === decodeURIComponent(match[3]));
      if (!source) return error("知识版本不存在", 404);
      const revision = appendReferenceKnowledgeAssetRevision(asset, source.content, {
        actor: account, summary: body.summary, operation: "restore", restoredFrom: source.revision_id,
      });
      asset.content = source.content; asset.version = revision.version; asset.base_version = revision.version;
      asset.base_hash = revision.content_hash; asset.draft_hash = revision.content_hash;
      asset.dirty = true; asset.vector_sync_status = "pending"; asset.updated_at = revision.created_at;
      asset.message = `已恢复 ${source.revision_id}，等待重新学习`;
      saveState();
      return json({ ...publicReferenceKnowledgeAsset(asset), revision: publicKnowledgeRevision(revision) });
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/([^/]+)\/draft$/);
    if (match && method === "PUT") {
      const asset = referenceKnowledgeAsset(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      if (!asset) return error("知识条目不存在", 404);
      const content = String(body.content || "");
      const revisions = referenceKnowledgeAssetRevisions(asset);
      const unchanged = asset.content === content;
      const revision = unchanged
        ? revisions[revisions.length - 1]
        : appendReferenceKnowledgeAssetRevision(asset, content, { actor: account, summary: body.summary, operation: "save" });
      if (!unchanged) {
        asset.content = content; asset.version = revision.version; asset.base_version = revision.version;
        asset.base_hash = revision.content_hash; asset.draft_hash = revision.content_hash;
        asset.dirty = true; asset.vector_sync_status = "pending"; asset.updated_at = revision.created_at;
      }
      saveState();
      return json({ ...publicReferenceKnowledgeAsset(asset), revision: publicKnowledgeRevision(revision), unchanged });
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/([^/]+)\/learn$/);
    if (match && method === "POST") {
      const asset = referenceKnowledgeAsset(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      if (!asset) return error("知识条目不存在", 404);
      asset.dirty = false; asset.vector_sync_status = "synced"; asset.content_hash = contentHash(asset.content);
      asset.message = "Mock 学习完成"; asset.updated_at = now();
      saveState();
      return json(publicReferenceKnowledgeAsset(asset));
    }
    match = path.match(/^\/api\/knowledge-assets\/([^/]+)\/([^/]+)$/);
    if (match && method === "DELETE") {
      if (state.users.find((user) => user.username === account)?.role !== "admin") return error("请联系管理员", 403);
      const libraryId = decodeURIComponent(match[1]);
      const assetId = decodeURIComponent(match[2]);
      const items = referenceKnowledgeAssets(libraryId);
      const assetIndex = items.findIndex((item) => item.id === assetId);
      if (assetIndex < 0) return error("知识条目不存在", 404);
      items.splice(assetIndex, 1);
      saveState();
      return json({ success: true, id: assetId });
    }
    if (match && method === "GET") {
      const asset = referenceKnowledgeAsset(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
      return asset ? json(publicReferenceKnowledgeAsset(asset)) : error("知识条目不存在", 404);
    }

    if (path === "/api/self-learning" && method === "GET") {
      const filter = String(requestUrl.searchParams.get("status") || "");
      return json(clone(selfLearningRecords().filter((item) => !filter || item.status === filter)));
    }
    match = path.match(/^\/api\/self-learning\/([^/]+)\/status$/);
    if (match && method === "PATCH") {
      const record = selfLearningRecords().find((item) => item.id === decodeURIComponent(match[1]));
      if (!record) return error("自学习记录不存在", 404);
      record.status = body.status || record.status; record.validation = { reason: body.reason || "Mock 状态更新" }; record.updated_at = now();
      saveState();
      return json(clone(record));
    }

    if (path === "/api/tracking/preview" && method === "POST") return json({
      app: body.app || "demo", document_count: 3, event_count: trackingEvents().length,
      warnings: [], documents: [{ id: "tracking-core", title: "Demo 核心玩法埋点" }, { id: "tracking-prop", title: "Demo 道具埋点" }, { id: "tracking-guide", title: "Demo 新手引导埋点" }],
    });
    if (path === "/api/tracking/sync" && method === "POST") {
      const runId = makeId("tracking-sync");
      state.trackingSync = { run_id: runId, status: "completed", phase: "completed", message: "Mock 增量同步完成", synced_at: now(), counts: { documents: 3, events: trackingEvents().length, vectors: 12, failures: 0 }, nodes: [{ token: "parse", label: "解析源文档", status: "completed" }, { token: "events", label: "写入物理事件", status: "completed" }, { token: "vectors", label: "构建独立向量索引", status: "completed" }] };
      saveState(); return json(clone(state.trackingSync));
    }
    if (path === "/api/tracking/sync/status" && method === "GET") {
      state.trackingSync ||= { run_id: "tracking-sync-seed", status: "completed", phase: "completed", message: "历史埋点独立索引已就绪", synced_at: now(), counts: { documents: 3, events: trackingEvents().length, vectors: 12, failures: 0 }, nodes: [] };
      return json(clone(state.trackingSync));
    }
    match = path.match(/^\/api\/tracking\/sync\/([^/]+)$/);
    if (match && method === "GET") return json(clone(state.trackingSync || { run_id: decodeURIComponent(match[1]), status: "completed", nodes: [] }));
    match = path.match(/^\/api\/tracking\/sync\/([^/]+)\/retry\/([^/]+)$/);
    if (match && method === "POST") return json({ run_id: decodeURIComponent(match[1]), node_token: decodeURIComponent(match[2]), status: "completed", message: "Mock 节点重试完成" });
    if (path === "/api/tracking/documents" && method === "GET") return json({ items: [
      { id: "tracking-core", title: "Demo 核心玩法埋点", app: "demo", event_count: 2, updated_at: now() },
      { id: "tracking-prop", title: "Demo 道具埋点", app: "demo", event_count: 1, updated_at: now() },
      { id: "tracking-guide", title: "Demo 新手引导埋点", app: "demo", event_count: 1, updated_at: now() },
    ], total: 3 });
    if (path === "/api/tracking/events" && method === "GET") {
      const query = String(requestUrl.searchParams.get("q") || "").toLowerCase();
      const items = trackingEvents().filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
      return json({ items: clone(items), total: items.length });
    }
    match = path.match(/^\/api\/tracking\/events\/([^/]+)$/);
    if (match && method === "GET") {
      const item = trackingEvents().find((event) => event.id === decodeURIComponent(match[1]));
      return item ? json(clone(item)) : error("物理事件不存在", 404);
    }
    if (path === "/api/tracking/vectors/status" && method === "GET") return json({ status: "ready", snapshot_id: "tracking-vector-v1", collection: "tracking_events_mock", event_count: trackingEvents().length, vector_count: 12, updated_at: now() });
    match = path.match(/^\/api\/tracking\/vectors\/([^/]+)\/retry$/);
    if (match && method === "POST") return json({ snapshot_id: decodeURIComponent(match[1]), status: "ready", message: "Mock 向量重建完成" });
    if (path === "/api/tracking/search" && method === "POST") {
      const query = String(body.query || "").toLowerCase();
      const tokens = query.split(/\s+/).filter(Boolean);
      const scored = trackingEvents().map((item) => {
        const haystack = `${item.event_name} ${item.event_title} ${item.description} ${item.parameters.join(" ")}`.toLowerCase();
        let score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 0.25 : 0), 0.62);
        if (/失败|fail/.test(query) && item.event_name === "level_fail") score = 0.96;
        if (/道具|prop/.test(query) && item.event_name === "prop_use") score = 0.95;
        if (/引导|guide/.test(query) && item.event_name === "guide_step") score = 0.94;
        return { ...item, score: Math.min(score, 0.99), evidence: ["关键词命中", "向量相似"] };
      }).sort((left, right) => right.score - left.score).slice(0, Math.min(Number(body.limit || 10), 50));
      return json({ query: body.query || "", notice: "结果来自脱敏 Mock 物理事件与独立向量索引", results: clone(scored), total: scored.length, retrieval_version: "tracking-mock-v1" });
    }
    if (path === "/api/tracking/feedback" && method === "GET") return json({ items: clone(state.trackingFeedback || []), total: (state.trackingFeedback || []).length });
    if (path === "/api/tracking/feedback" && method === "POST") {
      const item = { id: makeId("feedback"), ...body, created_at: now() }; state.trackingFeedback ||= []; state.trackingFeedback.push(item); saveState(); return json(clone(item));
    }
    if (path === "/api/tracking/golden-queries" && method === "GET") return json({ items: clone(trackingGoldenQueries()), total: trackingGoldenQueries().length });
    if (path === "/api/tracking/golden-queries" && method === "POST") {
      const expected = body.expected_event_names || body.expected_event_ids || [];
      const item = { id: makeId("golden"), query: String(body.query || ""), expected_event_names: expected.map((value) => trackingEvents().find((event) => event.id === value)?.event_name || value), reviewer: body.reviewer || account, version: body.version || "v1", created_at: now() };
      trackingGoldenQueries().push(item); saveState(); return json(clone(item));
    }
    if (path === "/api/tracking/golden-candidates" && method === "GET") return json({ items: clone(state.trackingGoldenCandidates || []), total: (state.trackingGoldenCandidates || []).length });
    if (path === "/api/tracking/golden-candidates/approve" && method === "POST") {
      const item = { id: makeId("golden"), query: body.query || "已批准候选", expected_event_names: body.expected_event_names || ["level_start"], reviewer: account, version: "v1", created_at: now() }; trackingGoldenQueries().push(item); saveState(); return json(clone(item));
    }
    if (path === "/api/tracking/evaluation" && method === "POST") {
      state.trackingEvaluation = { id: makeId("eval"), precision_at_5: 1, recall_at_10: 1, mrr: 1, passed: true, query_count: trackingGoldenQueries().length, evaluated_at: now(), thresholds: { precision_at_5: 0.8, recall_at_10: 0.9, mrr: 0.8 } }; saveState(); return json(clone(state.trackingEvaluation));
    }
    if (path === "/api/tracking/evaluation/latest" && method === "GET") return json(clone(trackingEvaluation()));
    if (path === "/api/tracking/designs" && method === "GET") return json({ items: clone(trackingDesigns()), total: trackingDesigns().length });
    if (path === "/api/tracking/designs" && method === "POST") {
      const designId = makeId("tracking-design");
      const design = { id: designId, title: String(body.title || "新埋点设计"), requirement_id: String(body.requirement_id || `REQ-${Date.now()}`), app: body.app || "demo", owner: body.actor || account, summary: String(body.summary || body.requirement_text || "根据策划目标生成的 Mock 埋点设计草稿。"), status: "reviewing", version: 1, updated_at: now(), events: [
        { id: makeId("event"), event_name: "feature_expose", event_title: "功能曝光", description: "记录目标功能进入可见区域", parameters: ["feature_id", "source"], review_status: "pending" },
        { id: makeId("event"), event_name: "feature_action", event_title: "功能操作", description: "记录核心操作及结果", parameters: ["feature_id", "action", "result"], review_status: "pending" },
      ], revisions: [{ version: 1, status: "reviewing", created_at: now() }] };
      trackingDesigns().unshift(design); saveState(); return json(clone(design));
    }
    match = path.match(/^\/api\/tracking\/designs\/([^/]+)$/);
    if (match && method === "GET") {
      const design = trackingDesigns().find((item) => item.id === decodeURIComponent(match[1])); return design ? json(clone(design)) : error("埋点设计单不存在", 404);
    }
    match = path.match(/^\/api\/tracking\/designs\/([^/]+)\/revisions$/);
    if (match && method === "GET") {
      const design = trackingDesigns().find((item) => item.id === decodeURIComponent(match[1])); return design ? json({ items: clone(design.revisions || []), total: (design.revisions || []).length }) : error("埋点设计单不存在", 404);
    }
    match = path.match(/^\/api\/tracking\/designs\/([^/]+)\/events\/([^/]+)\/review$/);
    if (match && method === "POST") {
      const design = trackingDesigns().find((item) => item.id === decodeURIComponent(match[1])); const event = design?.events.find((item) => item.id === decodeURIComponent(match[2]));
      if (!event) return error("设计事件不存在", 404); event.review_status = body.status || "approved"; event.review_comment = body.comment || ""; event.reviewed_by = account; design.status = design.events.every((item) => item.review_status === "approved") ? "ready" : "reviewing"; design.updated_at = now(); saveState(); return json(clone(event));
    }
    match = path.match(/^\/api\/tracking\/designs\/([^/]+)\/recheck$/);
    if (match && method === "POST") {
      const design = trackingDesigns().find((item) => item.id === decodeURIComponent(match[1])); if (!design) return error("埋点设计单不存在", 404); design.status = design.events.every((item) => item.review_status === "approved") ? "ready" : "reviewing"; design.updated_at = now(); saveState(); return json(clone(design));
    }
    match = path.match(/^\/api\/tracking\/designs\/([^/]+)\/freeze$/);
    if (match && method === "POST") {
      const design = trackingDesigns().find((item) => item.id === decodeURIComponent(match[1])); if (!design) return error("埋点设计单不存在", 404); if (!design.events.every((item) => item.review_status === "approved")) return error("仍有事件未通过评审"); design.status = "frozen"; design.version += 1; design.updated_at = now(); design.revisions ||= []; design.revisions.push({ version: design.version, status: "frozen", actor: body.actor || account, created_at: now() }); saveState(); return json(clone(design));
    }
    match = path.match(/^\/api\/tracking\/designs\/([^/]+)\/export\/([^/]+)$/);
    if (match && method === "GET") {
      const design = trackingDesigns().find((item) => item.id === decodeURIComponent(match[1])); if (!design) return error("埋点设计单不存在", 404);
      const format = decodeURIComponent(match[2]);
      if (format === "json") return json(clone(design));
      return text(`# ${design.title}\n\n- 需求 ID：${design.requirement_id}\n- 状态：${design.status}\n- 版本：v${design.version}\n\n## 设计事件\n\n${design.events.map((item) => `### ${item.event_name} · ${item.event_title}\n\n${item.description}\n\n参数：${item.parameters.join(", ")}\n`).join("\n")}`, "text/markdown; charset=utf-8");
    }

    const librarySpaceId = String(requestUrl.searchParams.get("space_id") || body.space_id || "demo");
    const libraryActor = state.users.find((user) => user.username === account) || state.users[0];
    const librarySpaceAllowed = libraryActor.role === "admin" || libraryActor.space_ids.includes(librarySpaceId);
    const visibleLibraryBase = (baseId) => state.libraryBases.find((item) => (
      item.id === baseId && (item.workspace_id === librarySpaceId || item.global_access)
    ));
    const canWriteLibraryBase = (base) => Boolean(base) && (!base.global_access || libraryActor.role === "admin");

    if (path.startsWith("/api/library/") && !librarySpaceAllowed) return error("无权访问该工作空间", 403);
    if (path === "/api/library/catalog" && method === "GET") return json(libraryCatalog(librarySpaceId));
    if (path === "/api/library/bases" && method === "GET") return json(clone(state.libraryBases.filter((base) => base.workspace_id === librarySpaceId || base.global_access)));
    if (path === "/api/library/bases" && method === "POST") {
      if (body.global_access && libraryActor.role !== "admin") return error("仅管理员可以创建全局知识库", 403);
      const workspaceId = body.global_access ? "global" : librarySpaceId;
      const item = { id: makeId("kb"), name: String(body.name || "新知识库"), description: String(body.description || ""), owner: account, workspace_id: workspaceId, global_access: workspaceId === "global", created_at: now(), updated_at: now(), file_count: 0, views: 0, uses: 0 };
      state.libraryBases.push(item);
      state.libraryFiles[item.id] = [];
      saveState();
      return json(clone(item));
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)$/);
    if (match && method === "PATCH") {
      const base = visibleLibraryBase(decodeURIComponent(match[1]));
      if (!base) return error("知识库不存在", 404);
      if (!canWriteLibraryBase(base)) return error("全局知识库仅管理员可修改", 403);
      if (Boolean(body.global_access) !== Boolean(base.global_access) && libraryActor.role !== "admin") return error("仅管理员可以调整知识库共享范围", 403);
      base.name = String(body.name || base.name);
      base.description = String(body.description || base.description);
      base.workspace_id = body.global_access ? "global" : librarySpaceId;
      base.global_access = base.workspace_id === "global";
      (state.libraryFiles[base.id] || []).forEach((file) => { file.workspace_id = base.workspace_id; });
      base.updated_at = now();
      saveState();
      return json(clone(base));
    }
    if (match && method === "DELETE") {
      const baseId = decodeURIComponent(match[1]);
      const base = visibleLibraryBase(baseId);
      if (!base) return error("知识库不存在", 404);
      if (!canWriteLibraryBase(base)) return error("全局知识库仅管理员可修改", 403);
      state.libraryBases = state.libraryBases.filter((item) => item.id !== baseId);
      delete state.libraryFiles[baseId];
      saveState();
      return json({ id: baseId, deleted: true });
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/view$/);
    if (match && method === "POST") {
      const base = visibleLibraryBase(decodeURIComponent(match[1]));
      if (!base) return error("知识库不存在", 404);
      base.views = Number(base.views || 0) + 1;
      saveState();
      return json(clone(base));
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/files$/);
    if (match && method === "GET") {
      const baseId = decodeURIComponent(match[1]);
      return visibleLibraryBase(baseId) ? json(clone(state.libraryFiles[baseId] || [])) : error("知识库不存在", 404);
    }
    if (match && method === "POST") {
      const baseId = decodeURIComponent(match[1]);
      const visibleBase = visibleLibraryBase(baseId);
      if (!visibleBase) return error("知识库不存在", 404);
      if (!canWriteLibraryBase(visibleBase)) return error("全局知识库仅管理员可修改", 403);
      const files = state.libraryFiles[baseId];
      if (!files) return error("知识库不存在", 404);
      const item = { id: makeId("file"), knowledge_base_id: baseId, workspace_id: visibleBase.workspace_id, file_name: String(body.file_name || "演示文档.md"), status: "learned", tag: "其他", summary: "已在浏览器中完成 Mock 学习。", chunk_count: 1, created_at: now(), updated_at: now(), content: "# Mock 文档\n\n此文件仅保存在当前浏览器。" };
      files.push(item);
      const base = state.libraryBases.find((entry) => entry.id === baseId);
      if (base) { base.file_count = files.length; base.updated_at = now(); }
      saveState();
      return json(clone(item));
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/files\/([^/]+)\/download$/);
    if (match && method === "GET") {
      const baseId = decodeURIComponent(match[1]);
      if (!visibleLibraryBase(baseId)) return error("知识库不存在", 404);
      const file = (state.libraryFiles[baseId] || []).find((item) => item.id === decodeURIComponent(match[2]));
      return file ? text(file.content || "", "text/plain; charset=utf-8") : error("知识文件不存在", 404);
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/files\/([^/]+)$/);
    if (match && method === "GET") {
      const baseId = decodeURIComponent(match[1]);
      if (!visibleLibraryBase(baseId)) return error("知识库不存在", 404);
      const file = (state.libraryFiles[baseId] || []).find((item) => item.id === decodeURIComponent(match[2]));
      return file ? json(fileDetail(baseId, file)) : error("知识文件不存在", 404);
    }
    if (match && method === "DELETE") {
      const baseId = decodeURIComponent(match[1]);
      const visibleBase = visibleLibraryBase(baseId);
      if (!visibleBase) return error("知识库不存在", 404);
      if (!canWriteLibraryBase(visibleBase)) return error("全局知识库仅管理员可修改", 403);
      const fileId = decodeURIComponent(match[2]);
      state.libraryFiles[baseId] = (state.libraryFiles[baseId] || []).filter((item) => item.id !== fileId);
      const base = state.libraryBases.find((item) => item.id === baseId);
      if (base) base.file_count = state.libraryFiles[baseId].length;
      saveState();
      return json({ id: fileId, deleted: true });
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/files\/([^/]+)\/tag$/);
    if (match && method === "PATCH") {
      const baseId = decodeURIComponent(match[1]);
      const visibleBase = visibleLibraryBase(baseId);
      if (!visibleBase) return error("知识库不存在", 404);
      if (!canWriteLibraryBase(visibleBase)) return error("全局知识库仅管理员可修改", 403);
      const file = (state.libraryFiles[baseId] || []).find((item) => item.id === decodeURIComponent(match[2]));
      if (!file) return error("知识文件不存在", 404);
      file.tag = body.tag;
      file.updated_at = now();
      saveState();
      return json(clone(file));
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/files\/([^/]+)\/relearn$/);
    if (match && method === "POST") {
      const baseId = decodeURIComponent(match[1]);
      const visibleBase = visibleLibraryBase(baseId);
      if (!visibleBase) return error("知识库不存在", 404);
      if (!canWriteLibraryBase(visibleBase)) return error("全局知识库仅管理员可修改", 403);
      const file = (state.libraryFiles[baseId] || []).find((item) => item.id === decodeURIComponent(match[2]));
      if (!file) return error("知识文件不存在", 404);
      file.status = "learned";
      file.updated_at = now();
      saveState();
      return json(clone(file));
    }
    match = path.match(/^\/api\/library\/bases\/([^/]+)\/query$/);
    if (match && method === "POST") {
      const baseId = decodeURIComponent(match[1]);
      const base = visibleLibraryBase(baseId);
      if (!base) return error("知识库不存在", 404);
      if (String(body.space_id || "") !== librarySpaceId) return error("知识检索空间不一致", 403);
      const matches = (state.libraryFiles[baseId] || []).map((file) => ({
        id: `${file.id}:0`, file_id: file.id, file_name: file.file_name,
        content: file.content || file.summary || "", score: 1,
      })).slice(0, Number(body.limit || 5));
      base.uses = Number(base.uses || 0) + 1;
      saveState();
      return json({knowledge_base_id: baseId, query: body.query || "", matches, uses: base.uses});
    }

    if (path === "/api/conversations" && method === "GET") return json(state.conversations.map(conversationSummary).sort((left, right) => {
      if (left.is_demo !== right.is_demo) return left.is_demo ? -1 : 1;
      if (left.is_demo) return left.demo_order - right.demo_order;
      return right.updated_at.localeCompare(left.updated_at);
    }));
    if (path === "/api/conversations" && method === "POST") {
      const tasks = { indicator_lineage: "指标与血缘查询", data_source: "数据源探查", udf: "UDF 生成", etl_template: "ETL 模板生成", validation_sql: "数据验证 SQL", sql_review: "SQL 规范检查" };
      const conversation = createConversation(body.task_id || "", tasks[body.task_id] || "", body.space_id || "demo");
      applyConversationSkillBindings(conversation, body);
      saveState();
      return json(publicConversation(conversation));
    }
    match = path.match(/^\/api\/conversations\/([^/]+)\/skills$/);
    if (match && method === "PATCH") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      if (!conversation) return error("对话不存在", 404);
      applyConversationSkillBindings(conversation, body);
      saveState();
      return json(publicConversation(conversation));
    }
    match = path.match(/^\/api\/conversations\/([^/]+)\/self-learning\/draft$/);
    if (match && method === "POST") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      if (!conversation) return error("对话不存在", 404);
      const answer = conversation.messages.find((item) => item.id === body.source_message_id) || conversation.messages.at(-1) || {};
      return json({
        title: "沿用本次有效修正", instruction: String(answer.content || "按本次确认结果处理后续相似问题。").slice(0, 2000),
        negative_instruction: "", type: "resolution_pattern",
        scope: { level: conversation.requirement_id ? "current_requirement" : "instance", requirement_id: conversation.requirement_id || "", game: "", stage: conversation.workflow_stage || "", objects: [] },
        preview: { user_guidance: "保存本次修正作为 Mock 规则", corrected_answer: String(answer.content || "") },
      });
    }
    match = path.match(/^\/api\/conversations\/([^/]+)\/self-learning$/);
    if (match && method === "POST") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      if (!conversation) return error("对话不存在", 404);
      const record = {
        id: makeId("learn"), type: body.type || "resolution_pattern", title: String(body.title || "有效修正"),
        instruction: String(body.instruction || ""), negative_instruction: String(body.negative_instruction || ""),
        status: "active", version: 1,
        scope: { level: body.scope?.level || "instance", requirement_id: body.scope?.level === "current_requirement" ? conversation.requirement_id || "" : "", game: body.scope?.game || "", stage: body.scope?.stage || "", objects: body.scope?.objects || [] },
        source: { conversation_id: conversation.id, message_ids: [body.source_message_id].filter(Boolean), requirement_id: conversation.requirement_id || "" },
        validation: { reason: "Mock 用户确认" }, updated_at: now(),
      };
      selfLearningRecords().unshift(record);
      saveState();
      return json(clone(record));
    }
    match = path.match(/^\/api\/conversations\/([^/]+)$/);
    if (match && method === "GET") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      return conversation ? json(publicConversation(conversation)) : error("对话不存在", 404);
    }
    if (match && method === "DELETE") {
      const id = decodeURIComponent(match[1]);
      if (state.conversations.some((item) => item.id === id && item.is_demo)) return error("演示数据，不支持删除", 400);
      state.conversations = state.conversations.filter((item) => item.id !== id);
      saveState();
      return json({ id, deleted: true });
    }
    match = path.match(/^\/api\/conversations\/([^/]+)\/reset$/);
    if (match && method === "POST") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      if (!conversation?.is_demo) return error("仅示例对话支持恢复执行前状态", 400);
      state.requirements = state.requirements.filter((item) => item.is_demo || item.conversation_id !== conversation.id);
      const ready = fixedDemoReadyConversation(conversation.created_at || now());
      Object.assign(conversation, ready, { updated_at: now() });
      saveState();
      return json(publicConversation(conversation));
    }
    match = path.match(/^\/api\/conversations\/([^/]+)\/stop$/);
    if (match && method === "POST") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      if (!conversation) return error("对话不存在", 404);
      conversation.generation_status = "stopped";
      saveState();
      return json(publicConversation(conversation));
    }
    match = path.match(/^\/api\/conversations\/([^/]+)\/stream$/);
    if (match && method === "GET") {
      const conversation = state.conversations.find((item) => item.id === decodeURIComponent(match[1]));
      if (!conversation) return error("对话不存在", 404);
      if (conversation.generation_status !== "running" || !Number.isInteger(conversation.pending_stage)) {
        return error("当前没有正在运行的对话", 409);
      }
      return stageStream(conversation, conversation.pending_stage);
    }

    if (path === "/api/chat/stream" && method === "POST") {
      let conversation = state.conversations.find((item) => item.id === body.conversation_id);
      if (body.rerun) {
        if (!conversation?.is_demo) return error("仅示例对话支持重新执行", 400);
        state.requirements = state.requirements.filter((item) => item.is_demo || item.conversation_id !== conversation.id);
        Object.assign(conversation, {
          intent: "", intent_label: "", requirement_id: "", review_gates: {},
          workflow_status: "", workflow_stage: "", workflow_stage_label: "",
          workflow_pause_reason: "", workflow_resume_stage: "", workflow_activity_log: [], workflow_events: [],
          generation_status: "", pending_stage: null, messages: [], rerun_active: true, updated_at: now(),
        });
      }
      if (!conversation) conversation = createConversation(body.task_id || "", "", body.space_id || "demo");
      const skillBindings = applyConversationSkillBindings(conversation, body, true);
      const timestamp = now();
      const visibleMessage = String(body.message || "").trim() || "请识别附件内容。";
      if (!conversation.messages.some((message) => message.role === "user")) conversation.title = visibleMessage;
      const intent = body.task_id ? "quick_task" : (isRequirementMessage(visibleMessage) ? "requirement" : "conversation");
      const taskLabels = { indicator_lineage: "指标与血缘查询", data_source: "数据源探查", udf: "UDF 生成", etl_template: "ETL 模板生成", validation_sql: "数据验证 SQL", sql_review: "SQL 规范检查" };
      const userMessage = {
        id: makeId("msg"), role: "user", content: visibleMessage, created_at: timestamp,
        activities: [], route: {}, reasoning_summary: "", artifacts: mockAttachmentArtifacts(body.attachments),
        skill_bindings: clone(skillBindings),
      };
      conversation.messages.push(userMessage);

      const labels = supplementLabels(visibleMessage);
      const existingRequirement = state.requirements.find((item) => item.id === conversation.requirement_id);
      const restartStageId = String(body.restart_stage || "");
      const restartStageIndex = workflowStages.findIndex((item) => item.id === restartStageId);
      if (existingRequirement && conversation.intent === "requirement" && restartStageIndex >= 0) {
        workflowStages.slice(restartStageIndex).forEach((stage) => {
          const gate = existingRequirement.review_gates?.stages?.[stage.id];
          if (!gate) return;
          gate.status = "invalidated";
          gate.reviewers = (gate.reviewers || []).map((reviewer) => ({
            ...reviewer,
            status: "invalidated",
            invalidated_at: now(),
          }));
        });
        conversation.workflow_events = [];
        conversation.workflow_status = "running";
        conversation.workflow_stage = restartStageId;
        conversation.workflow_stage_label = workflowStages[restartStageIndex].label;
        conversation.workflow_pause_reason = "";
        conversation.workflow_resume_stage = restartStageId;
        conversation.generation_status = "running";
        conversation.pending_stage = restartStageIndex;
        existingRequirement.workflow_status = "running";
        existingRequirement.status = "进行中";
        existingRequirement.current_stage = workflowStages[restartStageIndex].label;
        existingRequirement.updated_at = now();
        saveState();
        return stageStream(conversation, restartStageIndex, [
          ["conversation", { conversation_id: conversation.id }],
          ["route", {
            ...workflowRoute(existingRequirement.id, isFixedDemoConversation(conversation), restartStageIndex),
            restart_stage: restartStageId,
            preserve_workflow_events: false,
          }],
          ["activity", { message: `已读取本次阶段输入，准备重新执行${workflowStages[restartStageIndex].label}。` }],
        ]);
      }
      const materialGate = existingRequirement?.review_gates?.stages?.warehouse_research;
      if (
        labels.length
        && isFixedDemoConversation(conversation)
        && existingRequirement
        && ["awaiting_materials", "checking"].includes(materialGate?.status)
      ) {
        conversation.generation_status = "running";
        conversation.updated_at = now();
        return fixedDemoSupplementStream(conversation, existingRequirement, userMessage, labels);
      }

      if (existingRequirement && conversation.intent === "requirement") {
        const stageLabel = conversation.workflow_stage_label || "当前阶段";
        const content = `已收到：“${visibleMessage}”。\n\n该内容已保留在当前需求对话中，${stageLabel}的流程状态不变。`;
        const assistantMessage = {
          id: makeId("msg"), role: "assistant", content, created_at: now(),
          activities: ["已关联当前数仓研发需求"], route: {},
          reasoning_summary: "沿用当前需求、工作流阶段和对话上下文处理补充消息。", artifacts: [],
        };
        conversation.generation_status = "completed";
        conversation.updated_at = now();
        conversation.messages.push(assistantMessage);
        saveState();
        return sse([
          ["conversation", { conversation_id: conversation.id }],
          ["activity", { message: assistantMessage.activities[0] }],
          ["reasoning_delta", { text: assistantMessage.reasoning_summary }],
          ["delta", { text: content }],
          ["complete", { message: assistantMessage }],
        ]);
      }

      if (intent === "requirement") {
        const requirement = createWorkflowRequirement(
          conversation,
          visibleMessage.slice(0, 28) + (visibleMessage.length > 28 ? "..." : ""),
          visibleMessage,
          account,
          body.space_id || conversation.workspace_id || "demo",
        );
        const fixedDemo = isFixedDemoInput(visibleMessage);
        const route = workflowRoute(requirement.id, fixedDemo, 0);
        conversation.updated_at = now();
        saveState();
        return stageStream(conversation, 0, [
          ["conversation", { conversation_id: conversation.id }],
          ["activity", { message: fixedDemo
            ? "开始解析输入内容，识别任务目标、信息范围和处理类型。"
            : "已识别为数仓研发需求，准备启动六阶段流程" }],
          ["route", route],
        ]);
      }

      const route = { intent, label: taskLabels[body.task_id] || "普通问答", task_id: body.task_id || "", task_label: taskLabels[body.task_id] || "" };
      const content = mockReply(visibleMessage, body.task_id);
      const assistantMessage = { id: makeId("msg"), role: "assistant", content, created_at: now(), activities: [intent === "quick_task" ? `已选择${route.task_label} Agent` : "已识别为普通问答"], route, reasoning_summary: "使用浏览器本地 Mock 数据生成演示结果。", artifacts: [] };
      conversation.intent = intent;
      conversation.intent_label = route.label;
      conversation.task_id = body.task_id || conversation.task_id || "";
      conversation.task_label = taskLabels[conversation.task_id] || conversation.task_label || "";
      conversation.generation_status = "completed";
      conversation.updated_at = now();
      conversation.messages.push(assistantMessage);
      saveState();
      return sse([
        ["conversation", { conversation_id: conversation.id }],
        ["activity", { message: assistantMessage.activities[0] }],
        ["route", route],
        ["reasoning_delta", { text: assistantMessage.reasoning_summary }],
        ["delta", { text: content }],
        ["complete", { message: assistantMessage }],
      ]);
    }

    if (path === "/api/requirements" && method === "GET") return json(state.requirements
      .filter((item) => !item.is_demo)
      .map(({ files, review_gates, ...item }) => clone(item)));
    if (path === "/api/requirements" && method === "POST") {
      const conversation = createConversation("", "", body.space_id || "demo");
      const timestamp = now();
      const inputText = String(body.content || body.description || body.title || "新建数仓需求");
      conversation.messages = [
        { id: makeId("msg"), role: "user", content: inputText, created_at: timestamp, activities: [], route: {}, reasoning_summary: "", artifacts: [] },
      ];
      const requirement = createWorkflowRequirement(conversation, String(body.title || "新建数仓需求"), inputText, account, body.space_id || "demo");
      saveState();
      return json({ ...clone(requirement), generation_status: "running" });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)$/);
    if (match && method === "GET") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      return requirement ? json(clone(requirement)) : error("需求不存在", 404);
    }
    if (match && method === "DELETE") {
      const id = decodeURIComponent(match[1]);
      state.requirements = state.requirements.filter((item) => item.id !== id);
      saveState();
      return json({ id, deleted: true });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/start$/);
    if (match && method === "POST") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      if (!requirement) return error("需求不存在", 404);
      let conversation = state.conversations.find((item) => item.id === requirement.conversation_id);
      if (!conversation) {
        conversation = createConversation("", "", requirement.workspace_id || "demo");
        requirement.conversation_id = conversation.id;
        conversation.messages.push({ id: makeId("msg"), role: "user", content: requirement.input_text || requirement.title, created_at: now(), activities: [], route: {}, reasoning_summary: "", artifacts: [] });
      }
      conversation.intent = "requirement";
      conversation.intent_label = "数仓研发需求";
      conversation.requirement_id = requirement.id;
      conversation.review_gates = requirement.review_gates || { stages: {} };
      conversation.workflow_status = "running";
      conversation.workflow_stage = workflowStages[requirement.stage_count || 0]?.id || "requirement_review";
      conversation.workflow_stage_label = workflowStages[requirement.stage_count || 0]?.label || "需求评审";
      conversation.generation_status = "running";
      conversation.pending_stage = Math.min(requirement.stage_count || 0, workflowStages.length - 1);
      requirement.workflow_status = "running";
      requirement.status = "进行中";
      saveState();
      return json({ ...clone(requirement), conversation_id: conversation.id, generation_status: "running" });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/review-gates\/([^/]+)\/versions$/);
    if (match && method === "GET") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      const stageId = decodeURIComponent(match[2]);
      if (!requirement) return error("需求不存在", 404);
      const items = artifactVersionItems(requirement, stageId).map(({ content, ...item }) => item);
      const stage = workflowStages.find((item) => item.id === stageId);
      return json({ stage: stageId, stage_label: stage?.label || stageId, items });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/review-gates\/([^/]+)\/input$/);
    if (match && method === "GET") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      const stageId = decodeURIComponent(match[2]);
      const stageIndex = workflowStages.findIndex((item) => item.id === stageId);
      if (!requirement || stageIndex < 0 || !requirement.review_gates?.stages?.[stageId]) {
        return error("阶段输入不存在", 404);
      }
      const source = stageIndex === 0
        ? (requirement.input_text || S01_INPUT)
        : (requirement.fixed_demo ? fixedDemoStageFiles : stageFiles)[stageIndex - 1][2];
      return json({ stage: stageId, stage_label: workflowStages[stageIndex].label, content: source });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/review-gates\/([^/]+)\/versions\/([^/]+)(\/download)?$/);
    if (match && method === "GET") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      const stageId = decodeURIComponent(match[2]);
      const version = decodeURIComponent(match[3]);
      const item = artifactVersionItems(requirement, stageId).find((candidate) => candidate.version === version);
      if (!item) return error("产物版本不存在", 404);
      if (match[4]) return text(item.content, "text/markdown; charset=utf-8");
      return json(item);
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/review-gates\/([^/]+)\/confirm$/);
    if (match && method === "POST") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      const gate = requirement?.review_gates?.stages?.[decodeURIComponent(match[2])];
      if (!gate) return error("阶段评审数据不存在", 404);
      gate.status = "passed";
      gate.reviewers.forEach((reviewer) => { reviewer.status = "confirmed"; reviewer.confirmed_at = now(); });
      const stageId = decodeURIComponent(match[2]);
      const stageIndex = workflowStages.findIndex((item) => item.id === stageId);
      const conversation = state.conversations.find((item) => item.id === requirement.conversation_id);
      if (conversation && stageId === "requirement_review" && isFixedDemoConversation(conversation)) {
        const confirmationRequest = conversation.messages.find((message) => message.confirmation_request)?.confirmation_request || null;
        const nextConversation = fixedDemoAwaitingMaterialsConversation(
          conversation.created_at,
          requirement.id,
          confirmationRequest,
        );
        Object.assign(conversation, nextConversation, { created_at: conversation.created_at, updated_at: now() });
        requirement.review_gates = clone(nextConversation.review_gates);
        requirement.files = [stageFile(requirement.id, 0, true)];
        requirement.stage_count = 1;
        requirement.workflow_status = "paused";
        requirement.status = "已暂停";
        requirement.current_stage = "数仓调研";
        requirement.updated_at = now();
        saveState();
        return json({
          gate: clone(requirement.review_gates.stages.requirement_review),
          all_confirmed: true,
          resumed: true,
          conversation_id: requirement.conversation_id,
          stream_url: "",
        });
      }
      if (conversation) {
        const artifactLabels = {
          requirement_review: "需求评审报告",
          warehouse_research: "数仓调研报告",
          model_design: "模型设计报告",
          data_development: "数据开发结果",
          data_validation: "数据验证结果",
          solution_review: "方案审查报告",
        };
        conversation.messages.push({
          id: makeId("msg"), role: "user",
          content: `确认「${artifactLabels[stageId] || "阶段报告"} ${gate.version || "V1.0"}」无误`,
          created_at: now(), activities: [], route: {}, reasoning_summary: "", artifacts: [],
        });
      }
      const hasNextStage = stageIndex >= 0 && stageIndex < workflowStages.length - 1;
      if (conversation && hasNextStage) {
        const nextStage = workflowStages[stageIndex + 1];
        conversation.workflow_status = "running";
        conversation.workflow_stage = nextStage.id;
        conversation.workflow_stage_label = nextStage.label;
        conversation.workflow_pause_reason = "";
        conversation.workflow_resume_stage = nextStage.id;
        conversation.generation_status = "running";
        conversation.pending_stage = stageIndex + 1;
        requirement.workflow_status = "running";
        requirement.status = "进行中";
        requirement.current_stage = nextStage.label;
      } else if (conversation) {
        conversation.workflow_status = "completed";
        conversation.workflow_stage = "solution_review";
        conversation.workflow_stage_label = "方案审查";
        conversation.workflow_pause_reason = "";
        conversation.workflow_resume_stage = "";
        conversation.generation_status = "completed";
        conversation.pending_stage = null;
        requirement.workflow_status = "completed";
        requirement.status = "已完成";
        requirement.current_stage = "方案审查";
        conversation.messages.push({
          id: makeId("msg"), role: "assistant",
          content: "方案审查报告已确认，数仓研发需求流程已完成。",
          created_at: now(), activities: [], route: {},
          reasoning_summary: "", artifacts: [],
        });
        if (isFixedDemoConversation(conversation)) {
          const recordedAt = now();
          conversation.workflow_events = [
            ...(conversation.workflow_events || []).filter((event) => event.type !== "result"),
            {
              type: "result", status: "completed", requirement_id: requirement.id,
              current_stage: "solution_review", current_stage_label: "方案审查", reason: "",
              resume_stage: "", resume_input: "", pause_context: "",
              completed_stages: workflowStages.map((stage) => stage.id), statement_count: 5,
              generated_rules: Array.from({ length: 5 }, (_, index) => ({
                rule_id: `V${String(index + 1).padStart(3, "0")}`, instances: 1,
              })),
              validation_mode: "sql",
              message: "方案审查报告已确认，数仓研发需求流程已完成。",
              recorded_at: recordedAt,
            },
          ];
        }
      }
      requirement.updated_at = now();
      saveState();
      return json({
        gate: clone(gate), all_confirmed: true, resumed: Boolean(conversation),
        conversation_id: requirement.conversation_id,
        stream_url: conversation && hasNextStage ? `/api/conversations/${encodeURIComponent(conversation.id)}/stream` : "",
      });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/confirmations\/([^/]+)\/confirm$/);
    if (match && method === "POST") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      const conversation = state.conversations.find((item) => item.id === requirement?.conversation_id);
      const message = conversation?.messages.find((item) => item.confirmation_request?.id === decodeURIComponent(match[2]));
      const request = message?.confirmation_request;
      const selected = request?.options?.find((option) => option.value === body.value);
      if (!requirement || !conversation || !request) return error("确认项不存在", 404);
      if (!selected) return error("请选择有效的等级标签口径", 400);
      const confirmedRequest = fixedDemoRequirementConfirmation({ confirmed: true, selectedValue: selected.value });
      const nextConversation = fixedDemoAwaitingRequirementReviewConversation(
        conversation.created_at,
        requirement.id,
        confirmedRequest,
      );
      Object.assign(conversation, nextConversation, { created_at: conversation.created_at, updated_at: now() });
      requirement.status = "已暂停";
      requirement.current_stage = "需求评审";
      requirement.workflow_status = "paused";
      requirement.stage_count = 1;
      requirement.files = [stageFile(requirement.id, 0, true)];
      requirement.review_gates = clone(nextConversation.review_gates);
      requirement.confirmed_choices = { [request.id]: selected.value };
      requirement.updated_at = now();
      saveState();
      return json({
        confirmation: clone(confirmedRequest),
        conversation_id: conversation.id,
        selected_value: selected.value,
      });
    }
    match = path.match(/^\/api\/requirements\/([^/]+)\/files\/([^/]+?)(?:\/download)?$/);
    if (match && method === "GET") {
      const requirement = state.requirements.find((item) => item.id === decodeURIComponent(match[1]));
      const file = requirement?.files?.find((item) => item.name === decodeURIComponent(match[2]));
      if (!file) return error("文件不存在", 404);
      return json({ name: file.name, display_name: file.display_name, mime_type: file.mime_type, size: file.size, content: file.content, download_url: file.download_url });
    }

    return error(`Mock 接口未实现：${method} ${path}`, 404);
  }

  window.fetch = (input, options = {}) => handleApi(input, options).catch((caught) => error(caught?.message || "Mock 请求失败", 500));
  window.AIDW_PAGES_MOCK = true;
  window.AIDW_RESET_MOCK = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href*='/download']");
    if (!anchor) return;
    event.preventDefault();
    const blob = new Blob(["AIDW V1.0.0 GitHub Pages Mock 演示文件\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aidw-mock-artifact.txt";
    link.click();
    URL.revokeObjectURL(url);
  });
})();
