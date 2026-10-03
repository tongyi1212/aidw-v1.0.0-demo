const appState = {
  view: "chat",
  agentType: "dw_agent",
  enabledAgents: { dw_agent: true, codex_agent: true },
  conversationId: "",
  isDemoConversation: false,
  demoConversationInput: "",
  activeTaskId: "",
  activeTaskLabel: "",
  intent: "",
  intentLabel: "",
  requirementId: "",
  workflowStatus: "",
  workflowStage: "",
  workflowStageLabel: "",
  workflowPauseReason: "",
  workflowResumeStage: "",
  generationStatus: "",
  expandedRequirementId: "",
  messages: [],
  abortController: null,
  streamConversationId: "",
  currentArtifact: null,
  artifactRequestId: 0,
  artifactVersions: [],
  currentKnowledge: null,
  knowledgeDirty: false,
  knowledgeEditorLayout: "single",
  knowledgeEditorSingleMode: "preview",
  knowledgeRevisions: [],
  selectedKnowledgeRevision: null,
  knowledgeRevisionDetailMode: "diff",
  knowledgeRevisionContext: null,
  knowledgeItems: [],
  knowledgeCategories: [],
  knowledgeCategory: "all",
  configKnowledgeMode: "documents",
  pendingConversationDelete: null,
  conversations: [],
  conversationQuery: "",
  workflowEvents: [],
  requirementFiles: [],
  reviewGates: {},
  workflowDrawerOpen: false,
  workflowAnchorStage: "",
  workflowRerunStage: "",
  workflowRerunDraft: "",
  workflowRerunPlaceholder: "",
  selectedModel: "",
  availableModels: [],
  quickTasks: [],
  selectedAccount: "",
  pendingAttachments: [],
  queuedMessages: [],
  selectedMaterialIds: new Set(),
  supplementContext: null,
  materialProgress: {},
  pendingMaterialSubmission: null,
  executionDisclosureState: new Map(),
  executionResultViewState: new Map(),
  brandCollapsed: true,
  taskPanelCollapsed: false,
  requirements: [],
  requirementCreatedAtSort: "desc",
  requirementPage: 1,
  requirementPageSize: 50,
};

const STREAM_TEXT_STEP_MS = 24;

const MAX_ATTACHMENT_COUNT = 8;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 40 * 1024 * 1024;
const MAX_KNOWLEDGE_MARKDOWN_BYTES = 1024 * 1024;
const MAX_KNOWLEDGE_MARKDOWN_FILES = 50;
const SUPPORTED_ATTACHMENT_EXTENSIONS = new Set([
  "md", "txt", "sql", "json", "yaml", "yml", "csv", "pdf", "docx", "pptx", "xlsx",
]);

const MODEL_STORAGE_KEY = "aidw.selectedModel";
const ACCOUNT_STORAGE_KEY = "aidw.selectedAccount";
const ACTIVE_SPACE_STORAGE_KEY = "aidw.activeSpace";
const BRAND_COLLAPSED_STORAGE_KEY = "aidw.brandCollapsed";
const TASK_PANEL_COLLAPSED_STORAGE_KEY = "aidw.taskPanelCollapsed";
const AGENT_TYPE_STORAGE_KEY = "aidw.agentType";
const ENABLED_AGENTS_STORAGE_KEY = "aidw.enabledAgents";

const AGENTS = [
  {
    id: "dw_agent",
    name: "DW Agent",
    description: "面向数仓需求评审、调研、开发与数据验证。",
    icon: "database",
  },
  {
    id: "codex_agent",
    name: "Dw Agent",
    description: "面向本机代码分析、修改与工程任务处理。",
    icon: "square-terminal",
  },
];

let accountSpaces = [];
let activeSpaceId = "demo";
let selectedOverviewSpaceId = "";
let currentAccountUser = null;
let overviewModelPermissions = null;
let platformUsers = [];
let platformRoles = [];
let roleModules = [];
let editingSpace = null;
let deletingSpace = null;
let spaceFormIconValue = "";
let spaceFormIconDirty = false;
let editingUser = null;
let deletingUser = null;
let editingRole = null;
let editingKnowledgeCategory = null;
let deletingKnowledgeCategory = null;
let selectedKnowledgeMarkdownFiles = [];
let notificationSettings = null;
let notificationChats = [];
let notificationDeliveries = [];
let notificationMembers = [];
let selectedNotificationTemplateEvent = "requirement_review";
let notificationTemplateVariableTarget = "title";
let mcpServers = [];
let selectedMcpServerId = "";
let modelServiceModels = [];
let modelServiceProviders = [];
let selectedModelServiceTab = "models";
let editingModelServiceModel = null;
let editingModelServiceProvider = null;

const elements = {
  app: document.getElementById("app"),
  taskPanel: document.querySelector(".task-panel"),
  viewTitle: document.getElementById("view-title"),
  viewRequirementId: document.getElementById("view-requirement-id"),
  viewMeta: document.getElementById("view-meta"),
  overviewSpaceName: document.getElementById("overview-space-name"),
  overviewSpaceDescription: document.getElementById("overview-space-description"),
  overviewSpaceIcon: document.getElementById("overview-space-icon"),
  overviewMemberCount: document.getElementById("overview-member-count"),
  overviewSkillCount: document.getElementById("overview-skill-count"),
  overviewKnowledgeCount: document.getElementById("overview-knowledge-count"),
  overviewConversationCount: document.getElementById("overview-conversation-count"),
  overviewBackSettings: document.getElementById("overview-back-settings"),
  overviewNewChat: document.getElementById("overview-new-chat"),
  overviewOpenChat: document.getElementById("overview-open-chat"),
  overviewQuickChat: document.getElementById("overview-quick-chat"),
  overviewQuickKnowledge: document.getElementById("overview-quick-knowledge"),
  overviewQuickSkills: document.getElementById("overview-quick-skills"),
  overviewModelPermissionsList: document.getElementById("overview-model-permissions-list"),
  overviewModelPermissionsSave: document.getElementById("overview-model-permissions-save"),
  overviewModelPermissionsStatus: document.getElementById("overview-model-permissions-status"),
  brandPanel: document.querySelector(".brand-panel"),
  brandCollapse: document.querySelector(".sidebar-collapse"),
  agentList: document.getElementById("agent-list"),
  taskPanelToggle: document.getElementById("task-panel-toggle"),
  modelName: document.getElementById("model-name"),
  modelPicker: document.querySelector(".model-picker"),
  modelButton: document.getElementById("model-button"),
  modelMenu: document.getElementById("model-menu"),
  modelSearchInput: document.getElementById("model-search-input"),
  modelOptions: document.getElementById("model-options"),
  taskTypeButton: document.getElementById("task-type-button"),
  skillPicker: document.querySelector(".skill-picker"),
  taskTypeIcon: document.getElementById("task-type-icon"),
  taskTypeName: document.getElementById("task-type-name"),
  taskTypeMenu: document.getElementById("task-type-menu"),
  conversationList: document.getElementById("conversation-list"),
  conversationSearch: document.getElementById("conversation-search"),
  conversationSearchToggle: document.getElementById("conversation-search-toggle"),
  conversationSearchInput: document.getElementById("conversation-search-input"),
  conversationSearchClear: document.getElementById("conversation-search-clear"),
  chatContent: document.getElementById("chat-content"),
  emptyChatTitle: document.getElementById("empty-chat-title"),
  emptyChatDescription: document.getElementById("empty-chat-description"),
  messageList: document.getElementById("message-list"),
  taskContext: document.getElementById("task-context"),
  taskContextLabel: document.getElementById("task-context-label"),
  supplementContext: document.getElementById("supplement-context"),
  supplementContextItems: document.getElementById("supplement-context-items"),
  clearSupplementContext: document.getElementById("clear-supplement-context"),
  workflowRerunContext: document.getElementById("workflow-rerun-context"),
  workflowRerunContextLabel: document.getElementById("workflow-rerun-context-label"),
  clearWorkflowRerun: document.getElementById("clear-workflow-rerun"),
  chatInput: document.getElementById("chat-input"),
  composerDivider: document.getElementById("composer-divider"),
  attachmentList: document.getElementById("attachment-list"),
  sendButton: document.getElementById("send-button"),
  requirementList: document.getElementById("requirement-list"),
  requirementsView: document.getElementById("requirements-view"),
  requirementDetail: document.getElementById("requirement-detail"),
  requirementFilters: document.getElementById("requirement-filters"),
  requirementNameFilter: document.getElementById("requirement-name-filter"),
  requirementTypeChangeFilter: document.getElementById("requirement-type-change-filter"),
  requirementStageFilter: document.getElementById("requirement-stage-filter"),
  requirementCreatorFilter: document.getElementById("requirement-creator-filter"),
  requirementDateFilter: document.getElementById("requirement-date-filter"),
  requirementRefresh: document.getElementById("requirement-refresh"),
  requirementCreatedAtHeader: document.getElementById("requirement-created-at-header"),
  requirementCreatedAtSort: document.getElementById("requirement-created-at-sort"),
  requirementPagination: document.getElementById("requirement-pagination"),
  requirementPaginationSummary: document.getElementById("requirement-pagination-summary"),
  requirementPageSize: document.getElementById("requirement-page-size"),
  requirementPagePrev: document.getElementById("requirement-page-prev"),
  requirementPageIndicator: document.getElementById("requirement-page-indicator"),
  requirementPageNext: document.getElementById("requirement-page-next"),
  taskList: document.getElementById("task-list"),
  knowledgeList: document.getElementById("knowledge-list"),
  knowledgeBrowser: document.getElementById("knowledge-browser"),
  knowledgeCategoryNav: document.getElementById("knowledge-category-nav"),
  knowledgeSearch: document.getElementById("knowledge-search"),
  knowledgeDocumentTotal: document.getElementById("knowledge-document-total"),
  knowledgeSectionTitle: document.getElementById("knowledge-section-title"),
  knowledgeSectionDescription: document.getElementById("knowledge-section-description"),
  knowledgeCategoryAdd: document.getElementById("knowledge-category-add"),
  knowledgeCategoryActions: document.getElementById("knowledge-category-actions"),
  knowledgeCategoryEdit: document.getElementById("knowledge-category-edit"),
  knowledgeCategoryDelete: document.getElementById("knowledge-category-delete"),
  knowledgeCategoryFormDialog: document.getElementById("knowledge-category-form-dialog"),
  knowledgeCategoryForm: document.getElementById("knowledge-category-form"),
  knowledgeCategoryFormTitle: document.getElementById("knowledge-category-form-title"),
  knowledgeCategoryName: document.getElementById("knowledge-category-name"),
  knowledgeCategoryFormError: document.getElementById("knowledge-category-form-error"),
  knowledgeCategoryFormClose: document.getElementById("knowledge-category-form-close"),
  knowledgeCategoryFormCancel: document.getElementById("knowledge-category-form-cancel"),
  knowledgeCategoryDeleteDialog: document.getElementById("knowledge-category-delete-dialog"),
  knowledgeCategoryDeleteName: document.getElementById("knowledge-category-delete-name"),
  knowledgeCategoryDeleteCount: document.getElementById("knowledge-category-delete-count"),
  knowledgeCategoryDeleteError: document.getElementById("knowledge-category-delete-error"),
  knowledgeCategoryDeleteClose: document.getElementById("knowledge-category-delete-close"),
  knowledgeCategoryDeleteCancel: document.getElementById("knowledge-category-delete-cancel"),
  knowledgeCategoryDeleteConfirm: document.getElementById("knowledge-category-delete-confirm"),
  knowledgeDeleteDialog: document.getElementById("knowledge-delete-dialog"),
  knowledgeDeleteName: document.getElementById("knowledge-delete-name"),
  knowledgeDeleteError: document.getElementById("knowledge-delete-error"),
  knowledgeDeleteClose: document.getElementById("knowledge-delete-close"),
  knowledgeDeleteCancel: document.getElementById("knowledge-delete-cancel"),
  knowledgeDeleteConfirm: document.getElementById("knowledge-delete-confirm"),
  knowledgeCreateOpen: document.getElementById("knowledge-create-open"),
  knowledgeCreateDialog: document.getElementById("knowledge-create-dialog"),
  knowledgeCreateForm: document.getElementById("knowledge-create-form"),
  knowledgeCreateTitle: document.getElementById("knowledge-create-title"),
  knowledgeCreateDescription: document.getElementById("knowledge-create-description"),
  knowledgeCreateCategory: document.getElementById("knowledge-create-category"),
  knowledgeCreateDropzone: document.getElementById("knowledge-create-dropzone"),
  knowledgeCreateFile: document.getElementById("knowledge-create-file"),
  knowledgeCreateFileOpen: document.getElementById("knowledge-create-file-open"),
  knowledgeCreateFileName: document.getElementById("knowledge-create-file-name"),
  knowledgeCreateFileClear: document.getElementById("knowledge-create-file-clear"),
  knowledgeCreateError: document.getElementById("knowledge-create-error"),
  knowledgeCreateSubmit: document.getElementById("knowledge-create-submit"),
  libraryKnowledgePanel: document.getElementById("library-knowledge-panel"),
  knowledgeEditor: document.getElementById("knowledge-editor"),
  knowledgeEditorTitle: document.getElementById("knowledge-editor-title"),
  knowledgeEditorDescription: document.getElementById("knowledge-editor-description"),
  knowledgeEditorStatus: document.getElementById("knowledge-editor-status"),
  knowledgeEditorEdit: document.getElementById("knowledge-editor-edit"),
  knowledgeDownload: document.getElementById("knowledge-download"),
  knowledgeEditorDelete: document.getElementById("knowledge-editor-delete"),
  knowledgeEditorModebar: document.getElementById("knowledge-editor-modebar"),
  knowledgeEditorSingleModeButtons: document.querySelectorAll("[data-knowledge-editor-single-mode]"),
  knowledgeEditorSplit: document.getElementById("knowledge-editor-split"),
  knowledgeEditorSourcePane: document.getElementById("knowledge-editor-source-pane"),
  knowledgeEditorPreviewPane: document.getElementById("knowledge-editor-preview-pane"),
  knowledgeEditorFilename: document.getElementById("knowledge-editor-filename"),
  knowledgeEditorInput: document.getElementById("knowledge-editor-input"),
  knowledgeEditorPreview: document.getElementById("knowledge-editor-preview"),
  knowledgeHistoryOpen: document.getElementById("knowledge-history-open"),
  knowledgeRevisionDrawer: document.getElementById("knowledge-revision-drawer"),
  knowledgeRevisionBackdrop: document.getElementById("knowledge-revision-backdrop"),
  knowledgeRevisionClose: document.getElementById("knowledge-revision-close"),
  knowledgeRevisionTitle: document.getElementById("knowledge-revision-title"),
  knowledgeRevisionSummary: document.getElementById("knowledge-revision-summary"),
  knowledgeRevisionList: document.getElementById("knowledge-revision-list"),
  knowledgeRevisionDetail: document.getElementById("knowledge-revision-detail"),
  knowledgeSave: document.getElementById("knowledge-save"),
  artifactPanel: document.getElementById("artifact-panel"),
  artifactName: document.getElementById("artifact-name"),
  artifactMeta: document.getElementById("artifact-meta"),
  artifactPreview: document.getElementById("artifact-preview"),
  artifactContent: document.querySelector("#artifact-content code"),
  artifactDownload: document.getElementById("artifact-download"),
  artifactCopy: document.getElementById("artifact-copy"),
  artifactVersionsOpen: document.getElementById("artifact-versions-open"),
  artifactVersionsClose: document.getElementById("artifact-versions-close"),
  artifactVersionSidebar: document.getElementById("artifact-version-sidebar"),
  artifactVersionList: document.getElementById("artifact-version-list"),
  requirementDialog: document.getElementById("requirement-dialog"),
  requirementForm: document.getElementById("requirement-form"),
  requirementFormError: document.getElementById("requirement-form-error"),
  workflowDrawer: document.getElementById("workflow-drawer"),
  demoStart: document.getElementById("demo-start"),
  demoRerun: document.getElementById("demo-rerun"),
  workflowToggle: document.getElementById("workflow-toggle"),
  workflowClose: document.getElementById("workflow-close"),
  drawerRequirementMeta: document.getElementById("drawer-requirement-meta"),
  drawerRequirementId: document.getElementById("drawer-requirement-id"),
  drawerRequirementCopy: document.getElementById("drawer-requirement-copy"),
  reviewStepList: document.getElementById("review-step-list"),
  reviewUpdatedAt: document.getElementById("review-updated-at"),
  fileButton: document.getElementById("file-button"),
  fileInput: document.getElementById("file-input"),
  mobileTaskToggle: document.getElementById("mobile-task-toggle"),
  toast: document.getElementById("toast"),
  workspaceTrigger: document.getElementById("workspace-trigger"),
  workspaceMenu: document.getElementById("workspace-menu"),
  accountName: document.getElementById("account-name"),
  accountAvatar: document.getElementById("account-avatar"),
  workspaceMenuName: document.getElementById("workspace-menu-name"),
  workspaceMenuIcon: document.getElementById("workspace-menu-icon"),
  activeSpaceIcon: document.getElementById("active-space-icon"),
  activeSpaceName: document.getElementById("active-space-name"),
  spaceFlyoutTrigger: document.getElementById("space-flyout-trigger"),
  spacePickerFlyout: document.getElementById("space-picker-flyout"),
  spaceSearchInput: document.getElementById("space-search-input"),
  spaceOptions: document.getElementById("space-options"),
  accountHomeOpen: document.getElementById("account-home-open"),
  accountLogout: document.getElementById("account-logout"),
  accountPage: document.getElementById("account-page"),
  accountLogo: document.getElementById("account-logo"),
  accountMainReturn: document.getElementById("account-main-return"),
  accountNavItems: document.querySelectorAll(".account-nav-item[data-account-view]"),
  accountViewPanels: document.querySelectorAll("[data-account-view-panel]"),
  accountUserNav: document.getElementById("account-user-nav"),
  accountRoleNav: document.getElementById("account-role-nav"),
  accountNotificationNav: document.getElementById("account-notification-nav"),
  accountSkillReviewNav: document.getElementById("account-skill-review-nav"),
  accountAuthNav: document.getElementById("account-auth-nav"),
  accountMcpNav: document.getElementById("account-mcp-nav"),
  accountModelNav: document.getElementById("account-model-nav"),
  accountAuditNav: document.getElementById("account-audit-nav"),
  mcpServerCount: document.getElementById("mcp-server-count"),
  mcpServerList: document.getElementById("mcp-server-list"),
  mcpDetail: document.getElementById("mcp-detail"),
  modelServiceAddModel: document.getElementById("model-service-add-model"),
  modelServiceAddProvider: document.getElementById("model-service-add-provider"),
  modelServiceTabs: document.querySelectorAll("[data-model-service-tab]"),
  modelServicePanels: document.querySelectorAll("[data-model-service-panel]"),
  modelServiceModelBody: document.getElementById("model-service-model-body"),
  modelServiceProviderBody: document.getElementById("model-service-provider-body"),
  modelServiceModelDialog: document.getElementById("model-service-model-dialog"),
  modelServiceModelForm: document.getElementById("model-service-model-form"),
  modelServiceModelDialogTitle: document.getElementById("model-service-model-dialog-title"),
  modelServiceModelClose: document.getElementById("model-service-model-close"),
  modelServiceModelCancel: document.getElementById("model-service-model-cancel"),
  modelServiceModelName: document.getElementById("model-service-model-name"),
  modelServiceModelUpstream: document.getElementById("model-service-model-upstream"),
  modelServiceModelContext: document.getElementById("model-service-model-context"),
  modelServiceModelProvider: document.getElementById("model-service-model-provider"),
  modelServiceModelEnabled: document.getElementById("model-service-model-enabled"),
  modelServiceModelError: document.getElementById("model-service-model-error"),
  modelServiceProviderDialog: document.getElementById("model-service-provider-dialog"),
  modelServiceProviderForm: document.getElementById("model-service-provider-form"),
  modelServiceProviderDialogTitle: document.getElementById("model-service-provider-dialog-title"),
  modelServiceProviderClose: document.getElementById("model-service-provider-close"),
  modelServiceProviderCancel: document.getElementById("model-service-provider-cancel"),
  modelServiceProviderName: document.getElementById("model-service-provider-name"),
  modelServiceProviderType: document.getElementById("model-service-provider-type"),
  modelServiceProviderUrl: document.getElementById("model-service-provider-url"),
  modelServiceProviderKey: document.getElementById("model-service-provider-key"),
  modelServiceProviderEnabled: document.getElementById("model-service-provider-enabled"),
  modelServiceProviderError: document.getElementById("model-service-provider-error"),
  auditRefresh: document.getElementById("audit-refresh"),
  auditCount: document.getElementById("audit-count"),
  auditList: document.getElementById("audit-list"),
  accountSpaceSearch: document.getElementById("account-space-search"),
  accountSpaceCreate: document.getElementById("account-space-create"),
  accountSpaceTableBody: document.getElementById("account-space-table-body"),
  accountUserSearch: document.getElementById("account-user-search"),
  accountUserCreate: document.getElementById("account-user-create"),
  accountUserTableBody: document.getElementById("account-user-table-body"),
  accountRoleSearch: document.getElementById("account-role-search"),
  accountRoleCreate: document.getElementById("account-role-create"),
  accountRoleTableBody: document.getElementById("account-role-table-body"),
  notificationEnabled: document.getElementById("notification-enabled"),
  notificationAppStatus: document.getElementById("notification-app-status"),
  notificationPublicUrl: document.getElementById("notification-public-url"),
  notificationEventInputs: document.querySelectorAll("[data-notification-event]"),
  notificationRefreshChats: document.getElementById("notification-refresh-chats"),
  notificationSave: document.getElementById("notification-save"),
  notificationChatSummary: document.getElementById("notification-chat-summary"),
  notificationRouteBody: document.getElementById("notification-route-body"),
  notificationRefreshDeliveries: document.getElementById("notification-refresh-deliveries"),
  notificationDeliveryBody: document.getElementById("notification-delivery-body"),
  notificationTemplateEvent: document.getElementById("notification-template-event"),
  notificationTemplateCardTitle: document.getElementById("notification-template-card-title"),
  notificationTemplateVariables: document.getElementById("notification-template-variables"),
  notificationTemplateStatusField: document.getElementById("notification-template-status-field"),
  notificationTemplateStatus: document.getElementById("notification-template-status"),
  notificationTemplateThemes: document.getElementById("notification-template-themes"),
  notificationTemplateMention: document.getElementById("notification-template-mention"),
  notificationTemplateMentionLabel: document.getElementById("notification-template-mention-label"),
  notificationTemplateButtonEnabled: document.getElementById("notification-template-button-enabled"),
  notificationTemplateButtonLabel: document.getElementById("notification-template-button-label"),
  notificationTemplateFields: document.getElementById("notification-template-fields"),
  notificationTemplateReset: document.getElementById("notification-template-reset"),
  notificationTemplateTestSpace: document.getElementById("notification-template-test-space"),
  notificationTemplateTest: document.getElementById("notification-template-test"),
  notificationCardPreview: document.getElementById("notification-card-preview"),
  notificationMentionSummary: document.getElementById("notification-mention-summary"),
  notificationMentionBody: document.getElementById("notification-mention-body"),
  spaceFormDialog: document.getElementById("space-form-dialog"),
  spaceForm: document.getElementById("space-form"),
  spaceFormTitle: document.getElementById("space-form-title"),
  spaceFormName: document.getElementById("space-form-name"),
  spaceFormDescription: document.getElementById("space-form-description"),
  spaceFormIcon: document.getElementById("space-form-icon"),
  spaceFormIconPreview: document.getElementById("space-form-icon-preview"),
  spaceFormIconClear: document.getElementById("space-form-icon-clear"),
  spaceFormSubmit: document.getElementById("space-form-submit"),
  spaceFormError: document.getElementById("space-form-error"),
  spaceFormClose: document.getElementById("space-form-close"),
  spaceFormCancel: document.getElementById("space-form-cancel"),
  spaceDeleteDialog: document.getElementById("space-delete-dialog"),
  spaceDeleteName: document.getElementById("space-delete-name"),
  spaceDeleteError: document.getElementById("space-delete-error"),
  spaceDeleteClose: document.getElementById("space-delete-close"),
  spaceDeleteCancel: document.getElementById("space-delete-cancel"),
  spaceDeleteConfirm: document.getElementById("space-delete-confirm"),
  userFormDialog: document.getElementById("user-form-dialog"),
  userForm: document.getElementById("user-form"),
  userFormTitle: document.getElementById("user-form-title"),
  userFormName: document.getElementById("user-form-name"),
  userPasswordRow: document.getElementById("user-password-row"),
  userFormPassword: document.getElementById("user-form-password"),
  userFormRole: document.getElementById("user-form-role"),
  userFormSpaceList: document.getElementById("user-form-space-list"),
  userFormError: document.getElementById("user-form-error"),
  userFormClose: document.getElementById("user-form-close"),
  userFormCancel: document.getElementById("user-form-cancel"),
  userFormConfirm: document.getElementById("user-form-confirm"),
  userDeleteDialog: document.getElementById("user-delete-dialog"),
  userDeleteName: document.getElementById("user-delete-name"),
  userDeleteError: document.getElementById("user-delete-error"),
  userDeleteClose: document.getElementById("user-delete-close"),
  userDeleteCancel: document.getElementById("user-delete-cancel"),
  userDeleteConfirm: document.getElementById("user-delete-confirm"),
  roleFormDialog: document.getElementById("role-form-dialog"),
  roleForm: document.getElementById("role-form"),
  roleFormTitle: document.getElementById("role-form-title"),
  roleFormName: document.getElementById("role-form-name"),
  roleFormDescription: document.getElementById("role-form-description"),
  roleFormModuleList: document.getElementById("role-form-module-list"),
  roleFormError: document.getElementById("role-form-error"),
  roleFormClose: document.getElementById("role-form-close"),
  roleFormCancel: document.getElementById("role-form-cancel"),
  roleFormConfirm: document.getElementById("role-form-confirm"),
  conversationDeleteDialog: document.getElementById("conversation-delete-dialog"),
  conversationDeleteName: document.getElementById("conversation-delete-name"),
  conversationDeleteWarning: document.getElementById("conversation-delete-warning"),
  conversationDeleteError: document.getElementById("conversation-delete-error"),
  conversationDeleteClose: document.getElementById("conversation-delete-close"),
  conversationDeleteCancel: document.getElementById("conversation-delete-cancel"),
  conversationDeleteConfirm: document.getElementById("conversation-delete-confirm"),
};

const viewLabels = {
  chat: "新对话",
  requirements: "需求",
  tasks: "快速对话",
  knowledge: "知识库",
  skills: "Skills",
  agents: "Agents",
  library: "目录与知识库",
  overview: "概览",
};

const taskIcons = {
  indicator_lineage: "route",
  data_source: "database",
  udf: "braces",
  etl_template: "file-code-2",
  validation_sql: "list-checks",
  sql_review: "scan-search",
};

const defaultTaskType = {
  id: "",
  label: "默认",
  description: "自动识别并处理多对话",
  icon: "sparkles",
};

const taskPlaceholders = {
  indicator_lineage: "输入指标名、报表名、表名或字段名...",
  data_source: "输入业务含义、字段名或候选表...",
  udf: "描述函数输入、输出和目标引擎...",
  etl_template: "描述来源表、目标表、加载方式和调度周期...",
  validation_sql: "粘贴数据开发输出或输入目标表和验收要求...",
  sql_review: "粘贴需要检查的 Hive 或 Trino SQL...",
};

const workflowStageBlueprint = [
  { id: "requirement_review", label: "需求评审" },
  { id: "warehouse_research", label: "数仓调研" },
  { id: "model_design", label: "模型设计" },
  { id: "data_development", label: "数仓开发" },
  { id: "data_validation", label: "数据验证" },
  { id: "solution_review", label: "方案审查" },
];

const workflowStageSkillBindings = {
  requirement_review: { name: "需求评审 skill", version: "v1.0" },
  warehouse_research: { name: "数仓调研 skill", version: "v1.0" },
  model_design: { name: "模型设计 skill", version: "v1.0" },
  data_development: { name: "数仓开发 skill", version: "v1.0" },
  data_validation: { name: "数据验证 skill", version: "v1.0" },
  solution_review: { name: "方案审查 skill", version: "v1.0" },
};

function renderWorkflowSkillInvocation(stage, lead = "调用") {
  const binding = workflowStageSkillBindings[stage];
  if (!binding) return "";
  return `${escapeHtml(lead)} <span class="stage-skill-invocation">${escapeHtml(binding.name)} ${escapeHtml(binding.version)}</span>`;
}

const requirementReviewConfirmationReasons = new Set([
  "请确认需求准入报告后继续",
  "请确认需求评审报告后继续",
]);
const warehouseResearchConfirmationReasons = new Set([
  "请确认数仓调研报告后继续",
]);
const modelDesignConfirmationReasons = new Set([
  "请确认模型设计报告后继续",
]);
const dataDevelopmentConfirmationReasons = new Set([
  "请确认数据开发结果后继续",
]);
const dataValidationConfirmationReasons = new Set([
  "请确认数据验证结果后继续",
]);
const solutionReviewConfirmationReasons = new Set([
  "请确认方案审查报告并完成流程",
]);

function isRequirementReviewConfirmationReason(reason) {
  return requirementReviewConfirmationReasons.has(String(reason || ""));
}

function isWarehouseResearchConfirmationReason(reason) {
  return warehouseResearchConfirmationReasons.has(String(reason || ""));
}

function isModelDesignConfirmationReason(reason) {
  return modelDesignConfirmationReasons.has(String(reason || ""));
}

function isDataDevelopmentConfirmationReason(reason) {
  return dataDevelopmentConfirmationReasons.has(String(reason || ""));
}

function isDataValidationConfirmationReason(reason) {
  return dataValidationConfirmationReasons.has(String(reason || ""));
}

function isSolutionReviewConfirmationReason(reason) {
  return solutionReviewConfirmationReasons.has(String(reason || ""));
}

const workflowToolNames = {
  load: "飞书文档读取",
  gate: "入口门禁检查",
  parse: "需求解析模型",
  assets: "指标资产目录",
  browser: "Magic 报表只读探查",
  explore: "元数据与维度探查",
  feasibility: "需求可行性评审模型",
  report: "评审报告生成",
  retrieve: "资产证据检索",
  design: "模型设计生成",
  develop: "数据开发生成",
  generate: "结果生成",
  validation: "数据验证生成",
};

const workflowStatusLabels = {
  waiting: "未开始",
  started: "进行中",
  running: "进行中",
  completed: "已完成",
  failed: "失败",
  paused: "已暂停",
  stopped: "已停止",
};

function workflowProgressIcon(status, showWaitingCircle = false) {
  if (status === "completed") return "check";
  if (status === "running" || status === "started") return "loader-circle";
  if (status === "paused") return "pause";
  if (status === "stopped") return "square";
  return showWaitingCircle ? "circle" : "";
}

const knowledgeIcons = {
  sql_specs: "code-xml",
  sql_writing_specs: "file-code-2",
  field_specs: "text-cursor-input",
  model_specs: "network",
  game_scope: "gamepad-2",
  metric_catalog: "sigma",
  data_catalog: "database",
  prompts_skills: "sparkles",
  validation_policy: "shield-check",
  requirement_document_summary_prompt: "align-left",
  requirement_parse_prompt: "scan-text",
  requirement_feasibility_prompt: "list-checks",
  warehouse_research_prompt: "database-zap",
  model_design_prompt: "waypoints",
  data_development_prompt: "code-2",
  platform_development_prompt: "blocks",
  data_validation_prompt: "flask-conical",
  scheduling_specs: "calendar-clock",
  etl_template_catalog: "layout-template",
  fault_handbook: "wrench",
  smesser_agent_api: "plug-zap",
  knowledge_governance: "book-lock",
  requirement_report_prompt: "file-check-2",
  paused_action_prompt: "pause-circle",
  auth_settings: "key-round",
  requirement_routes: "route",
  validation_rules: "shield-check",
  production_asset_catalog: "network",
  self_learning: "brain-circuit",
  tracking_retrieval: "scan-search",
  tracking_design: "clipboard-pen-line",
  user_library: "book-copy",
  "knowledge_asset:dimension": "tags",
  "knowledge_asset:udf": "function-square",
  "knowledge_asset:data_source": "database",
  "knowledge_asset:performance": "gauge",
};

const documentTemplateKnowledgeIds = new Set([
  "sql_specs",
  "sql_writing_specs",
  "field_specs",
  "model_specs",
  "metric_catalog",
  "etl_template_catalog",
  "game_scope",
  "requirement_parse_prompt",
  "requirement_feasibility_prompt",
  "requirement_report_prompt",
  "warehouse_research_prompt",
  "model_design_prompt",
  "data_development_prompt",
  "platform_development_prompt",
  "data_validation_prompt",
  "paused_action_prompt",
]);

const phaseOneKnowledgeTypeLabels = {
  sql_specs: "规范文档",
  sql_writing_specs: "规范文档",
  field_specs: "规范文档",
  model_specs: "规范文档",
  fault_handbook: "知识手册",
  game_scope: "业务知识",
};

const phaseOneKnowledgeDisplayOverrides = {
  "knowledge_asset:udf": {
    title: "UDF 目录",
    description: "业务自定义函数的签名、适用引擎、调用示例和注意事项",
  },
};

const knowledgeCategoryGroupDefinitions = [
  { id: "knowledge", label: "知识", description: "规范、字典与业务知识", order: 10, icon: "book-open" },
  { id: "agent_config", label: "Agent配置", description: "Agent 使用的 Prompt 与规则配置", order: 20, icon: "bot" },
  { id: "system_settings", label: "系统设置", description: "平台运行与访问配置", order: 30, icon: "settings" },
];

const knowledgeCategoryGroupByCategory = {
  warehouse_standards: "knowledge",
  knowledge_assets: "knowledge",
  business_knowledge: "knowledge",
  business_rules: "knowledge",
  knowledge_governance: "knowledge",
  workflow_prompts: "agent_config",
  agent_rules: "agent_config",
  validation_policies: "agent_config",
  platform_configuration: "system_settings",
};

const knowledgeSearchAliases = {
  metric_catalog: "指标口径字典 指标口径",
};

function knowledgeCategoryGroup(item) {
  const id = item.category_group || knowledgeCategoryGroupByCategory[item.category] || "knowledge";
  return knowledgeCategoryGroupDefinitions.find((group) => group.id === id) || knowledgeCategoryGroupDefinitions[0];
}

function knowledgeOperationalState(item) {
  const label = String(item.type_label || "");
  const searchableTotal = label.match(/可检索\s*(?:\d+\s*\/\s*)?(\d+)/);
  return searchableTotal?.[1] || "";
}

function isKnowledgeDocumentTemplate(documentId) {
  return documentTemplateKnowledgeIds.has(documentId) || String(documentId || "").startsWith("custom:");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { width: 16, height: 16, "aria-hidden": "true" } });
  }
}

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listFrom(value) {
  return Array.isArray(value) ? value : [];
}

function storedModel() {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) || "";
  } catch (_error) {
    return "";
  }
}

function storedAccount() {
  try {
    return localStorage.getItem(ACCOUNT_STORAGE_KEY) || "demo.user";
  } catch (_error) {
    return "demo.user";
  }
}

function storedBoolean(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch (_error) {
    return fallback;
  }
}

function loadAgentSettings() {
  const defaults = { dw_agent: true, codex_agent: true };
  let enabledAgents = defaults;
  let storedAgentType = "dw_agent";
  try {
    const parsed = JSON.parse(localStorage.getItem(ENABLED_AGENTS_STORAGE_KEY) || "null");
    if (parsed && typeof parsed === "object") {
      enabledAgents = Object.fromEntries(AGENTS.map((agent) => [agent.id, parsed[agent.id] !== false]));
    }
    storedAgentType = localStorage.getItem(AGENT_TYPE_STORAGE_KEY) || "dw_agent";
  } catch (_error) {
    enabledAgents = defaults;
  }
  if (!AGENTS.some((agent) => enabledAgents[agent.id])) enabledAgents.codex_agent = true;
  appState.enabledAgents = enabledAgents;
  appState.agentType = enabledAgents[storedAgentType]
    ? storedAgentType
    : (enabledAgents.codex_agent ? "codex_agent" : "dw_agent");
}

function persistAgentSettings() {
  try {
    localStorage.setItem(AGENT_TYPE_STORAGE_KEY, appState.agentType);
    localStorage.setItem(ENABLED_AGENTS_STORAGE_KEY, JSON.stringify(appState.enabledAgents));
  } catch (_error) {
    // Keep the current page state when storage is unavailable.
  }
}

function accountInitials(account) {
  return String(account || "")
    .split(/[._-]/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AI";
}

function setSelectedAccount(account) {
  const nextAccount = String(account || "demo.user").trim() || "demo.user";
  appState.selectedAccount = nextAccount;
  elements.accountName.textContent = nextAccount;
  elements.accountAvatar.innerHTML = icon("user-round");
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, nextAccount);
  } catch (_error) {
    // The current page still reflects the selected account.
  }
  refreshIcons();
}

function closeWorkspaceMenu() {
  elements.workspaceMenu.hidden = true;
  elements.workspaceTrigger.setAttribute("aria-expanded", "false");
  elements.spacePickerFlyout.hidden = true;
  elements.spaceFlyoutTrigger.setAttribute("aria-expanded", "false");
}

function setBrandCollapsed(collapsed, persist = true) {
  const nextCollapsed = window.matchMedia("(max-width: 760px)").matches ? true : Boolean(collapsed);
  appState.brandCollapsed = nextCollapsed;
  elements.brandPanel.classList.toggle("is-collapsed", nextCollapsed);
  document.documentElement.style.setProperty("--brand-width", nextCollapsed ? "72px" : "188px");
  elements.brandCollapse.setAttribute("aria-expanded", String(!nextCollapsed));
  elements.brandCollapse.setAttribute("aria-label", nextCollapsed ? "展开左导航" : "收起左导航");
  elements.brandCollapse.title = nextCollapsed ? "展开左导航" : "收起左导航";
  elements.brandCollapse.innerHTML = icon(nextCollapsed ? "chevron-right" : "chevron-left");
  if (persist) {
    try {
      localStorage.setItem(BRAND_COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    } catch (_error) {
      // Keep the layout state for this page session.
    }
  }
  closeWorkspaceMenu();
  refreshIcons();
}

function setTaskPanelCollapsed(collapsed, persist = true) {
  appState.taskPanelCollapsed = Boolean(collapsed);
  elements.app.classList.toggle("task-collapsed", appState.taskPanelCollapsed);
  elements.taskPanel.setAttribute("aria-hidden", String(appState.taskPanelCollapsed || appState.view !== "chat"));
  elements.taskPanelToggle.setAttribute("aria-expanded", String(!appState.taskPanelCollapsed));
  elements.taskPanelToggle.setAttribute("aria-label", appState.taskPanelCollapsed ? "展开最近对话" : "收起最近对话");
  elements.taskPanelToggle.title = appState.taskPanelCollapsed ? "展开最近对话" : "收起最近对话";
  elements.taskPanelToggle.innerHTML = icon(appState.taskPanelCollapsed ? "chevron-right" : "chevron-left");
  if (persist) {
    try {
      localStorage.setItem(TASK_PANEL_COLLAPSED_STORAGE_KEY, String(appState.taskPanelCollapsed));
    } catch (_error) {
      // Keep the layout state for this page session.
    }
  }
  refreshIcons();
}

function accountApi(path, options = {}) {
  return api(path, {
    ...options,
    headers: { "X-AIDW-Account": appState.selectedAccount, ...(options.headers || {}) },
  });
}

function formatAccountDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).replaceAll("/", "-");
}

function formatKnowledgeStatusDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function currentSpace() {
  return accountSpaces.find((space) => space.id === activeSpaceId) || accountSpaces[0] || null;
}

function spaceFallbackIcon(space) {
  return space?.icon || String(space?.name || "SP").slice(0, 2).toUpperCase();
}

function isSpaceImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function renderSpaceIcon(element, space, { settingsFallback = false } = {}) {
  if (!element) return;
  const image = isSpaceImage(space?.icon);
  element.replaceChildren();
  if (image) {
    const imageElement = document.createElement("img");
    imageElement.className = "space-icon-image";
    imageElement.src = space.icon;
    imageElement.alt = "";
    imageElement.draggable = false;
    element.append(imageElement);
    element.style.background = "transparent";
  } else if (settingsFallback) {
    element.innerHTML = icon("settings");
    element.style.background = "";
  } else {
    element.textContent = spaceFallbackIcon(space);
    element.style.background = space?.color || "#e2e8f0";
  }
}

function renderSpaceFormIcon(name = "") {
  const preview = elements.spaceFormIconPreview;
  if (!preview) return;
  const image = isSpaceImage(spaceFormIconValue);
  preview.replaceChildren();
  if (image) {
    const imageElement = document.createElement("img");
    imageElement.className = "space-icon-image";
    imageElement.src = spaceFormIconValue;
    imageElement.alt = "";
    imageElement.draggable = false;
    preview.append(imageElement);
  } else {
    preview.textContent = String(name || "SP").slice(0, 2).toUpperCase();
    preview.style.background = "#e2e8f0";
  }
  elements.spaceFormIconClear.hidden = !image;
}

function updateActiveSpaceDisplay() {
  const space = currentSpace();
  if (!space) return;
  activeSpaceId = space.id;
  elements.workspaceMenuName.textContent = space.name;
  renderSpaceIcon(elements.workspaceMenuIcon, space);
  elements.activeSpaceIcon.innerHTML = icon("settings");
  elements.activeSpaceIcon.style.background = "";
  elements.activeSpaceName.textContent = space.name;
  renderSpaceOptions();
  refreshIcons();
}

function createSpaceOption(space) {
  const option = document.createElement("button");
  option.type = "button";
  option.dataset.spaceId = space.id;
  option.setAttribute("role", "option");
  option.setAttribute("aria-selected", String(space.id === activeSpaceId));
  const badge = document.createElement("span");
  badge.className = "space-option-icon";
  renderSpaceIcon(badge, space);
  const name = document.createElement("strong");
  name.textContent = space.name;
  const check = document.createElement("span");
  check.className = "space-option-check";
  check.textContent = space.id === activeSpaceId ? "\u2713" : "";
  option.append(badge, name, check);
  return option;
}

function renderSpaceOptions() {
  const query = elements.spaceSearchInput.value.trim().toLowerCase();
  const filtered = accountSpaces.filter((space) => space.name.toLowerCase().includes(query));
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "space-options-empty";
    empty.textContent = "没有匹配的空间";
    elements.spaceOptions.replaceChildren(empty);
    return;
  }
  elements.spaceOptions.replaceChildren(...filtered.map(createSpaceOption));
}

function switchSpace(spaceId) {
  if (!accountSpaces.some((space) => space.id === spaceId)) return;
  activeSpaceId = spaceId;
  try {
    localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, activeSpaceId);
  } catch (_error) {
    // Keep the active space for this page session.
  }
  updateActiveSpaceDisplay();
  window.DWAgentSkills?.setContext?.({ account: appState.selectedAccount, spaceId: activeSpaceId });
  closeWorkspaceMenu();
  document.dispatchEvent(new CustomEvent("aidw:space-changed", { detail: { spaceId } }));
  showToast(`已进入 ${currentSpace()?.name || "空间"}`);
}

function startOverviewChat() {
  showAgentPage();
  setView("chat");
  startNewChat();
}

function openOverviewKnowledge() {
  showAgentPage();
  setView("knowledge");
  if (appState.configKnowledgeMode === "library" && typeof loadLibraryBases === "function") loadLibraryBases();
  else loadKnowledge();
}

function openSpaceOverview(space = currentSpace()) {
  if (!space) return;
  selectedOverviewSpaceId = space.id;
  closeWorkspaceMenu();
  elements.accountPage.hidden = false;
  elements.app.hidden = true;
  appState.view = "overview";
  showAccountView("space-overview");
}

function renderOverviewModelPermissions(message = "") {
  const list = elements.overviewModelPermissionsList;
  const saveButton = elements.overviewModelPermissionsSave;
  if (!list || !saveButton) return;
  const isAdmin = currentAccountUser?.role === "admin";
  saveButton.disabled = !isAdmin || !overviewModelPermissions || !overviewModelPermissions.models?.length;
  saveButton.hidden = false;
  if (message) {
    list.replaceChildren(Object.assign(document.createElement("p"), {
      className: "overview-model-permissions-empty",
      textContent: message,
    }));
    return;
  }
  const models = listFrom(overviewModelPermissions?.models);
  if (!models.length) {
    list.replaceChildren(Object.assign(document.createElement("p"), {
      className: "overview-model-permissions-empty",
      textContent: "暂无可用模型，请先在模型页添加并启用模型",
    }));
    return;
  }
  list.replaceChildren(...models.map((model) => {
    const row = document.createElement("div");
    row.className = `overview-model-permission-row${model.globally_enabled ? "" : " is-disabled"}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "overview-model-permission-checkbox";
    checkbox.dataset.modelPermissionId = model.id;
    checkbox.checked = Boolean(model.allowed);
    checkbox.disabled = !isAdmin || !model.globally_enabled;
    checkbox.setAttribute("aria-label", `允许使用 ${model.name || model.id}`);

    const copy = document.createElement("span");
    copy.className = "overview-model-permission-copy";
    const name = document.createElement("strong");
    name.textContent = model.name || model.id;
    const upstream = document.createElement("small");
    upstream.textContent = model.upstream_id || model.id;
    copy.append(name, upstream);

    const select = document.createElement("select");
    select.className = "overview-model-permission-default";
    select.dataset.modelPermissionDefault = model.id;
    select.disabled = !isAdmin || !model.globally_enabled || !model.allowed;
    select.setAttribute("aria-label", `${model.name || model.id}默认模型设置`);
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "";
    select.append(placeholder);
    const selected = document.createElement("option");
    selected.value = model.id;
    selected.textContent = overviewModelPermissions?.default_model_id === model.id ? "默认模型" : "设为默认模型";
    selected.selected = overviewModelPermissions?.default_model_id === model.id;
    select.append(selected);

    const state = document.createElement("span");
    state.className = "overview-model-permission-state";
    if (!model.globally_enabled) state.textContent = "全局已停用";
    row.append(checkbox, copy, select, state);
    return row;
  }));
  if (elements.overviewModelPermissionsStatus && !elements.overviewModelPermissionsStatus.textContent) {
    elements.overviewModelPermissionsStatus.textContent = "";
  }
}

function updateOverviewModelPermissionDefault() {
  const models = listFrom(overviewModelPermissions?.models);
  const checked = models.filter((model) => model.allowed && model.globally_enabled);
  if (!checked.some((model) => model.id === overviewModelPermissions.default_model_id)) {
    overviewModelPermissions.default_model_id = checked[0]?.id || "";
  }
}

function handleOverviewModelPermissionsChange(event) {
  if (!overviewModelPermissions || currentAccountUser?.role !== "admin") return;
  elements.overviewModelPermissionsStatus.textContent = "";
  elements.overviewModelPermissionsStatus.className = "overview-model-permissions-status";
  const checkbox = event.target.closest("input[data-model-permission-id]");
  if (checkbox) {
    const model = overviewModelPermissions.models.find((item) => item.id === checkbox.dataset.modelPermissionId);
    if (!model || !model.globally_enabled) return;
    model.allowed = checkbox.checked;
    updateOverviewModelPermissionDefault();
    renderOverviewModelPermissions();
    return;
  }
  const select = event.target.closest("select[data-model-permission-default]");
  if (!select) return;
  overviewModelPermissions.default_model_id = select.value || "";
  updateOverviewModelPermissionDefault();
  renderOverviewModelPermissions();
}

async function saveOverviewModelPermissions() {
  if (currentAccountUser?.role !== "admin" || !overviewModelPermissions) return;
  const allowedModelIds = overviewModelPermissions.models
    .filter((model) => model.allowed && model.globally_enabled)
    .map((model) => model.id);
  updateOverviewModelPermissionDefault();
  if (!allowedModelIds.length || !overviewModelPermissions.default_model_id) {
    elements.overviewModelPermissionsStatus.textContent = "至少需要启用一个模型，并指定默认模型";
    elements.overviewModelPermissionsStatus.className = "overview-model-permissions-status is-error";
    return;
  }
  elements.overviewModelPermissionsSave.disabled = true;
  elements.overviewModelPermissionsStatus.textContent = "正在保存...";
  elements.overviewModelPermissionsStatus.className = "overview-model-permissions-status is-saving";
  try {
    const saved = await accountApi(`/api/spaces/${encodeURIComponent(selectedOverviewSpaceId)}/model-permissions`, {
      method: "PUT",
      body: JSON.stringify({ model_ids: allowedModelIds, default_model_id: overviewModelPermissions.default_model_id }),
    });
    overviewModelPermissions = saved;
    renderOverviewModelPermissions();
    elements.overviewModelPermissionsStatus.textContent = "模型权限已保存";
    elements.overviewModelPermissionsStatus.className = "overview-model-permissions-status is-success";
  } catch (error) {
    elements.overviewModelPermissionsStatus.textContent = error.message || "模型权限保存失败";
    elements.overviewModelPermissionsStatus.className = "overview-model-permissions-status is-error";
  } finally {
    if (overviewModelPermissions) {
      elements.overviewModelPermissionsSave.disabled = currentAccountUser?.role !== "admin";
    }
  }
}

async function loadSpaceOverview() {
  if (!elements.overviewSpaceName || appState.view !== "overview" || elements.accountPage.hidden) return;
  const space = accountSpaces.find((item) => item.id === selectedOverviewSpaceId) || currentSpace();
  if (!space) return;
  elements.overviewSpaceName.textContent = space.name;
  elements.overviewSpaceDescription.textContent = space.description || "";
  elements.overviewSpaceDescription.hidden = !space.description;
  renderSpaceIcon(elements.overviewSpaceIcon, space);
  const workspaceConversations = appState.conversations.filter((conversation) => (
    String(conversation.workspace_id || "demo") === String(space.id)
  ));
  elements.overviewConversationCount.textContent = String(workspaceConversations.length);
  overviewModelPermissions = null;
  if (elements.overviewModelPermissionsStatus) {
    elements.overviewModelPermissionsStatus.textContent = "";
    elements.overviewModelPermissionsStatus.className = "overview-model-permissions-status";
  }
  renderOverviewModelPermissions("正在加载模型权限...");
  const results = await Promise.allSettled([
    accountApi(`/api/spaces/${encodeURIComponent(space.id)}/reviewers`),
    accountApi("/api/custom-skills"),
    accountApi("/api/knowledge"),
    workspaceConversations.length || appState.conversations.length ? Promise.resolve(appState.conversations) : api("/api/conversations"),
    accountApi(`/api/spaces/${encodeURIComponent(space.id)}/model-permissions`),
  ]);
  if (appState.view !== "overview" || elements.accountPage.hidden || selectedOverviewSpaceId !== space.id) return;
  const users = results[0].status === "fulfilled" ? listFrom(results[0].value) : [];
  const skills = results[1].status === "fulfilled" ? listFrom(results[1].value) : [];
  const knowledge = results[2].status === "fulfilled" ? listFrom(results[2].value) : [];
  const conversations = results[3].status === "fulfilled" ? listFrom(results[3].value) : appState.conversations;
  overviewModelPermissions = results[4].status === "fulfilled" ? results[4].value : { models: [], default_model_id: "" };
  const memberCount = users.length;
  const skillCount = skills.filter((skill) => skill.enabled !== false && (skill.publish_status === "published" || skill.version)).length;
  const conversationCount = conversations.filter((conversation) => String(conversation.workspace_id || "demo") === String(space.id)).length;
  elements.overviewMemberCount.textContent = String(memberCount);
  elements.overviewSkillCount.textContent = String(skillCount);
  elements.overviewKnowledgeCount.textContent = String(knowledge.length);
  elements.overviewConversationCount.textContent = String(conversationCount);
  renderOverviewModelPermissions(results[4].status === "fulfilled" ? "" : "模型权限加载失败，请稍后重试");
  refreshIcons();
}

function setCurrentAccountUser(user) {
  if (!user?.username) return;
  currentAccountUser = user;
  setSelectedAccount(user.username);
  const isAdmin = user.role === "admin";
  elements.accountUserNav.hidden = !isAdmin;
  elements.accountRoleNav.hidden = !isAdmin;
  elements.accountNotificationNav.hidden = !isAdmin;
  elements.accountSkillReviewNav.hidden = false;
  if (elements.accountAuthNav) elements.accountAuthNav.hidden = !isAdmin;
  elements.accountMcpNav.hidden = !isAdmin;
  elements.accountModelNav.hidden = !isAdmin;
  elements.accountAuditNav.hidden = !isAdmin;
  elements.accountSpaceCreate.hidden = !isAdmin;
  elements.accountUserCreate.hidden = !isAdmin;
  elements.accountRoleCreate.hidden = !isAdmin;
  if (overviewModelPermissions) renderOverviewModelPermissions();
  window.AIDWSkillReview?.setAccount(user.username, true);
  window.DWAgentSkills?.setContext?.({ account: user.username, spaceId: activeSpaceId });
  if (!isAdmin && (elements.accountUserNav.classList.contains("active") || elements.accountRoleNav.classList.contains("active") || elements.accountNotificationNav.classList.contains("active") || elements.accountAuthNav?.classList.contains("active") || elements.accountMcpNav.classList.contains("active") || elements.accountModelNav.classList.contains("active") || elements.accountAuditNav.classList.contains("active"))) showAccountView("spaces");
  if (appState.conversationId) renderMessages();
}

window.AIDWAccount = {
  isAdmin: () => currentAccountUser?.role === "admin",
};

async function initializeAccountWorkspace() {
  try {
    const user = await accountApi("/api/account/me");
    setCurrentAccountUser(user);
  } catch (_error) {
    setSelectedAccount("demo.user");
    setCurrentAccountUser(await accountApi("/api/account/me"));
  }
  accountSpaces = await accountApi("/api/spaces");
  let preferred = "";
  try {
    preferred = localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY) || "";
  } catch (_error) {
    preferred = "";
  }
  activeSpaceId = accountSpaces.some((space) => space.id === preferred)
    ? preferred
    : accountSpaces[0]?.id || "demo";
  updateActiveSpaceDisplay();
  window.DWAgentSkills?.setContext?.({ account: appState.selectedAccount, spaceId: activeSpaceId });
}

function showAccountPage() {
  closeWorkspaceMenu();
  elements.app.hidden = true;
  elements.accountPage.hidden = false;
  elements.accountSpaceSearch.value = "";
  elements.accountRoleSearch.value = "";
  showAccountView("spaces");
}

function showAgentPage() {
  elements.accountPage.hidden = true;
  elements.app.hidden = false;
}

async function showAccountView(view) {
  const adminViews = new Set(["users", "roles", "notifications", "auth"]);
  adminViews.add("mcp");
  adminViews.add("models");
  adminViews.add("audit");
  const allowed = adminViews.has(view) && currentAccountUser?.role !== "admin" ? "spaces" : view;
  const navigationView = allowed === "space-overview" ? "spaces" : allowed;
  elements.accountNavItems.forEach((item) => item.classList.toggle("active", item.dataset.accountView === navigationView));
  elements.accountViewPanels.forEach((panel) => panel.hidden = panel.dataset.accountViewPanel !== allowed);
  if (allowed === "space-overview") {
    await loadSpaceOverview();
  } else if (allowed === "users") {
    elements.accountUserSearch.value = "";
    await loadPlatformUsers();
  } else if (allowed === "roles") {
    elements.accountRoleSearch.value = "";
    await loadPlatformRoles();
  } else if (allowed === "notifications") {
    await loadNotificationAdmin();
  } else if (allowed === "skill-reviews") {
    await window.AIDWSkillReview?.load?.();
  } else if (allowed === "auth") {
    await window.AIDWKnowledgeHub?.loadAuth?.();
  } else if (allowed === "mcp") {
    await loadMcpAdmin();
  } else if (allowed === "models") {
    await loadModelServiceAdmin();
  } else if (allowed === "audit") {
    await loadAuditPage();
  } else {
    renderAccountSpaces();
  }
}

function formatAuditDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function auditStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (["running", "in_progress", "processing"].includes(normalized)) return "is-running";
  if (["failed", "error"].includes(normalized)) return "is-failed";
  if (["paused", "waiting", "stopped", "cancelled"].includes(normalized)) return "is-paused";
  return "is-completed";
}

function auditStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  if (["running", "in_progress", "processing"].includes(normalized)) return "运行中";
  if (["failed", "error"].includes(normalized)) return "失败";
  if (["paused", "waiting"].includes(normalized)) return "等待中";
  if (["stopped", "cancelled"].includes(normalized)) return "已停止";
  return "已完成";
}

function renderAuditRecords(payload) {
  const records = Array.isArray(payload) ? payload : listFrom(payload?.records);
  const total = Number(payload?.total ?? records.length);
  elements.auditCount.textContent = `共 ${total.toLocaleString("zh-CN")} 条任务记录`;
  if (!records.length) {
    elements.auditList.replaceChildren(Object.assign(document.createElement("p"), {
      className: "audit-empty",
      textContent: "暂无任务记录",
    }));
    return;
  }
  elements.auditList.replaceChildren(...records.map((record) => {
    const status = auditStatusLabel(record.status);
    const row = document.createElement("article");
    row.className = "audit-record";
    row.setAttribute("role", "listitem");
    row.innerHTML = `<span class="audit-record-icon">${icon("clock-3")}</span><div class="audit-record-copy"><strong>任务 · ${escapeHtml(record.task_label || "消息生成")}</strong><small>会话 · ${escapeHtml(formatAuditDate(record.created_at || record.updated_at))}</small></div><span class="audit-status-dot ${auditStatusClass(record.status)}" role="img" aria-label="${status}" title="${status}"></span>`;
    return row;
  }));
  refreshIcons();
}

async function loadAuditPage() {
  elements.auditList.setAttribute("aria-busy", "true");
  try {
    renderAuditRecords(await accountApi("/api/audit"));
  } catch (error) {
    elements.auditCount.textContent = "共 0 条任务记录";
    elements.auditList.replaceChildren(Object.assign(document.createElement("p"), {
      className: "audit-empty is-error",
      textContent: error.message || "审计记录加载失败",
    }));
  } finally {
    elements.auditList.removeAttribute("aria-busy");
  }
}

async function loadMcpAdmin() {
  elements.mcpServerList.setAttribute("aria-busy", "true");
  try {
    const payload = await accountApi("/api/mcp/servers");
    mcpServers = Array.isArray(payload) ? payload : (payload?.servers || []);
    if (!mcpServers.some((server) => server.id === selectedMcpServerId)) {
      selectedMcpServerId = mcpServers[0]?.id || "";
    }
    renderMcpServers();
    renderMcpDetail();
  } catch (error) {
    mcpServers = [];
    selectedMcpServerId = "";
    elements.mcpServerList.replaceChildren(Object.assign(document.createElement("p"), {
      className: "mcp-empty-row",
      textContent: error.message || "MCP 服务加载失败",
    }));
    renderMcpDetail();
  } finally {
    elements.mcpServerList.removeAttribute("aria-busy");
  }
}

function renderMcpServers() {
  elements.mcpServerCount.textContent = mcpServers.length ? `${mcpServers.length} 个` : "暂无";
  if (!mcpServers.length) {
    const empty = document.createElement("p");
    empty.className = "mcp-empty-row";
    empty.textContent = "暂无 MCP 服务";
    elements.mcpServerList.replaceChildren(empty);
    return;
  }
  elements.mcpServerList.replaceChildren(...mcpServers.map((server) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mcp-server-option";
    button.classList.toggle("is-active", server.id === selectedMcpServerId);
    button.dataset.mcpServerId = server.id;
    button.setAttribute("aria-pressed", String(server.id === selectedMcpServerId));
    button.innerHTML = `<span class="mcp-server-status ${server.space_enabled ? "is-enabled" : ""}"></span><span class="mcp-server-option-copy"><strong>${escapeHtml(server.name || server.id)}</strong><small>${escapeHtml(server.endpoint || "未配置 Endpoint")}</small></span><i data-lucide="chevron-right"></i>`;
    return button;
  }));
  refreshIcons();
}

function renderMcpDetail() {
  const server = mcpServers.find((item) => item.id === selectedMcpServerId);
  if (!server) {
    elements.mcpDetail.innerHTML = `<div class="mcp-empty-state">${icon("plug-zap")}<strong>${mcpServers.length ? "选择一个 MCP 服务" : "暂无 MCP 服务"}</strong><span>${mcpServers.length ? "查看服务连接信息和工具目录" : "请先配置一个可用的工具服务"}</span></div>`;
    refreshIcons();
    return;
  }
  const tools = Array.isArray(server.tools) ? server.tools : [];
  elements.mcpDetail.innerHTML = `
    <header class="mcp-detail-header">
      <div><span class="mcp-detail-kicker">MCP SERVER</span><h2>${escapeHtml(server.name || server.id)}</h2></div>
      <button id="mcp-test-connection" class="mcp-test-button" type="button"><i data-lucide="plug-zap"></i><span>测试连接</span></button>
    </header>
    <div class="mcp-connection-meta">
      <p><strong>Endpoint</strong><code>${escapeHtml(server.endpoint || "-")}</code></p>
      <p><strong>标头</strong><span class="mcp-header-state ${server.headers_configured ? "is-ready" : ""}">${server.headers_configured ? "已配置自定义标头" : "未配置自定义标头"}</span></p>
    </div>
    <div class="mcp-permission-grid">
      <label class="mcp-permission-option"><span><strong>空间启用</strong><small>允许会话发现该服务</small></span><input id="mcp-space-enabled" type="checkbox" ${server.space_enabled ? "checked" : ""}></label>
      <label class="mcp-permission-option"><span><strong>允许写操作</strong><small>写入工具需额外审计核对</small></span><input id="mcp-allow-write" type="checkbox" ${server.allow_write ? "checked" : ""}></label>
    </div>
    <section class="mcp-tool-section" aria-labelledby="mcp-tool-title">
      <header><div><span class="mcp-section-kicker">TOOL CATALOG</span><h3 id="mcp-tool-title">工具目录</h3></div><label class="mcp-select-all"><input type="checkbox" checked disabled><span>全选</span></label></header>
      <div class="mcp-tool-list">${tools.map((tool) => `<label class="mcp-tool-row"><span class="mcp-tool-copy"><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(tool.description)}</small></span><span class="mcp-tool-kind">${escapeHtml(tool.kind || "read")}</span><input type="checkbox" aria-label="允许工具" ${tool.allowed === false ? "" : "checked"} disabled></label>`).join("")}</div>
    </section>
    <p id="mcp-test-result" class="mcp-test-result" aria-live="polite"></p>`;
  const spaceToggle = document.getElementById("mcp-space-enabled");
  const writeToggle = document.getElementById("mcp-allow-write");
  spaceToggle?.addEventListener("change", () => updateMcpServer(server.id, { space_enabled: spaceToggle.checked }, spaceToggle));
  writeToggle?.addEventListener("change", () => updateMcpServer(server.id, { allow_write: writeToggle.checked }, writeToggle));
  document.getElementById("mcp-test-connection")?.addEventListener("click", () => testMcpServer(server.id));
  refreshIcons();
}

async function updateMcpServer(serverId, values, sourceToggle) {
  if (sourceToggle) sourceToggle.disabled = true;
  try {
    const updated = await accountApi(`/api/mcp/servers/${encodeURIComponent(serverId)}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    const index = mcpServers.findIndex((server) => server.id === serverId);
    if (index >= 0) mcpServers[index] = updated;
    renderMcpServers();
    renderMcpDetail();
    showToast("MCP 设置已更新");
  } catch (error) {
    if (sourceToggle) sourceToggle.checked = !sourceToggle.checked;
    showToast(error.message || "MCP 设置保存失败");
  } finally {
    if (sourceToggle) sourceToggle.disabled = false;
  }
}

async function testMcpServer(serverId) {
  const button = document.getElementById("mcp-test-connection");
  const result = document.getElementById("mcp-test-result");
  if (button) button.disabled = true;
  if (result) {
    result.className = "mcp-test-result is-checking";
    result.textContent = "正在测试连接...";
  }
  try {
    const payload = await accountApi(`/api/mcp/servers/${encodeURIComponent(serverId)}/test`, { method: "POST", body: "{}" });
    const message = payload.message || (payload.ok ? "连接成功" : "连接失败");
    if (result) {
      result.className = `mcp-test-result ${payload.ok ? "is-success" : "is-error"}`;
      result.textContent = message;
    }
    showToast(message, payload.ok ? "success" : "error");
  } catch (error) {
    if (result) {
      result.className = "mcp-test-result is-error";
      result.textContent = error.message || "连接测试失败";
    }
    showToast(error.message || "连接测试失败");
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadModelServiceAdmin() {
  elements.modelServiceModelBody.setAttribute("aria-busy", "true");
  try {
    const [models, providers] = await Promise.all([
      accountApi("/api/model-service/models"),
      accountApi("/api/model-service/providers"),
    ]);
    modelServiceModels = listFrom(models);
    modelServiceProviders = listFrom(providers);
    renderModelServiceProviders();
    renderModelServiceModels();
  } catch (error) {
    modelServiceModels = [];
    modelServiceProviders = [];
    renderModelServiceModels(error.message || "模型加载失败");
    renderModelServiceProviders();
  } finally {
    elements.modelServiceModelBody.removeAttribute("aria-busy");
  }
}

function setModelServiceTab(tab) {
  selectedModelServiceTab = tab === "providers" ? "providers" : "models";
  elements.modelServiceTabs.forEach((button) => {
    const active = button.dataset.modelServiceTab === selectedModelServiceTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  elements.modelServicePanels.forEach((panel) => {
    panel.hidden = panel.dataset.modelServicePanel !== selectedModelServiceTab;
  });
}

function renderModelServiceModels(errorMessage = "") {
  if (errorMessage) {
    elements.modelServiceModelBody.replaceChildren(Object.assign(document.createElement("p"), {
      className: "model-service-empty",
      textContent: errorMessage,
    }));
    return;
  }
  if (!modelServiceModels.length) {
    elements.modelServiceModelBody.replaceChildren(Object.assign(document.createElement("p"), {
      className: "model-service-empty",
      textContent: "暂无模型，请先添加模型",
    }));
    return;
  }
  elements.modelServiceModelBody.replaceChildren(...modelServiceModels.map((model) => {
    const row = document.createElement("div");
    row.className = "model-service-row";
    row.setAttribute("role", "row");
    row.innerHTML = `
      <span class="model-service-model-copy"><strong>${escapeHtml(model.name || model.upstream_id)}</strong><small>${escapeHtml(model.provider_name || "未关联服务提供方")}</small></span>
      <code>${escapeHtml(model.upstream_id || "-")}</code>
      <span>${Number(model.context_length || 0).toLocaleString("zh-CN")}</span>
      <button class="model-service-toggle ${model.enabled ? "is-on" : ""}" type="button" role="switch" aria-checked="${String(Boolean(model.enabled))}" data-model-service-action="toggle-model" data-model-service-id="${escapeHtml(model.id)}"><span></span><em>${model.enabled ? "已启用" : "已停用"}</em></button>
      <span class="model-service-actions"><button class="model-service-icon-action" type="button" aria-label="编辑模型" title="编辑" data-model-service-action="edit-model" data-model-service-id="${escapeHtml(model.id)}">${icon("pencil")}</button><button class="model-service-icon-action is-danger" type="button" aria-label="删除模型" title="删除" data-model-service-action="delete-model" data-model-service-id="${escapeHtml(model.id)}">${icon("trash-2")}</button></span>`;
    return row;
  }));
  refreshIcons();
}

function renderModelServiceProviders() {
  if (!modelServiceProviders.length) {
    elements.modelServiceProviderBody.replaceChildren(Object.assign(document.createElement("p"), {
      className: "model-service-empty",
      textContent: "暂无服务提供方，请先添加",
    }));
    renderModelServiceProviderOptions();
    return;
  }
  elements.modelServiceProviderBody.replaceChildren(...modelServiceProviders.map((provider) => {
    const row = document.createElement("div");
    row.className = "model-service-provider-row";
    row.setAttribute("role", "row");
    const modelCount = modelServiceModels.filter((model) => model.provider_id === provider.id).length;
    row.innerHTML = `
      <span class="model-service-provider-copy"><strong>${escapeHtml(provider.name)}</strong><small>${modelCount} 个模型${provider.api_key_configured ? " · 已配置 Key" : ""}</small></span>
      <span class="model-service-provider-type">${escapeHtml(provider.provider_type || "-")}</span>
      <code title="${escapeHtml(provider.base_url || "")}">${escapeHtml(provider.base_url || "未填写服务地址")}</code>
      <button class="model-service-toggle ${provider.enabled ? "is-on" : ""}" type="button" role="switch" aria-checked="${String(Boolean(provider.enabled))}" data-model-service-action="toggle-provider" data-model-service-id="${escapeHtml(provider.id)}"><span></span><em>${provider.enabled ? "已启用" : "已停用"}</em></button>
      <span class="model-service-actions"><button class="model-service-row-action" type="button" data-model-service-action="test-provider" data-model-service-id="${escapeHtml(provider.id)}">${icon("plug-zap")}<span>测试</span></button><button class="model-service-icon-action" type="button" aria-label="编辑服务提供方" title="编辑" data-model-service-action="edit-provider" data-model-service-id="${escapeHtml(provider.id)}">${icon("pencil")}</button><button class="model-service-icon-action is-danger" type="button" aria-label="删除服务提供方" title="删除" data-model-service-action="delete-provider" data-model-service-id="${escapeHtml(provider.id)}">${icon("trash-2")}</button></span>`;
    return row;
  }));
  renderModelServiceProviderOptions();
  refreshIcons();
}

function renderModelServiceProviderOptions(selectedId = "") {
  if (!elements.modelServiceModelProvider) return;
  elements.modelServiceModelProvider.replaceChildren(...modelServiceProviders.map((provider) => {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = `${provider.name}${provider.enabled ? "" : "（已停用）"}`;
    return option;
  }));
  const fallback = selectedId || modelServiceProviders.find((provider) => provider.enabled)?.id || modelServiceProviders[0]?.id || "";
  elements.modelServiceModelProvider.value = fallback;
}

function openModelServiceModelForm(model = null) {
  editingModelServiceModel = model;
  elements.modelServiceModelDialogTitle.textContent = model ? "编辑模型" : "添加模型";
  elements.modelServiceModelName.value = model?.name || "";
  elements.modelServiceModelUpstream.value = model?.upstream_id || "";
  elements.modelServiceModelContext.value = String(model?.context_length || 32768);
  elements.modelServiceModelEnabled.checked = model ? Boolean(model.enabled) : true;
  renderModelServiceProviderOptions(model?.provider_id || "");
  elements.modelServiceModelError.hidden = true;
  elements.modelServiceModelDialog.showModal();
  window.setTimeout(() => elements.modelServiceModelName.focus(), 0);
}

function openModelServiceProviderForm(provider = null) {
  editingModelServiceProvider = provider;
  elements.modelServiceProviderDialogTitle.textContent = provider ? "编辑服务提供方" : "添加服务提供方";
  elements.modelServiceProviderName.value = provider?.name || "";
  elements.modelServiceProviderType.value = provider?.provider_type || "openai";
  elements.modelServiceProviderUrl.value = provider?.base_url || "";
  elements.modelServiceProviderKey.value = "";
  elements.modelServiceProviderKey.placeholder = provider?.api_key_configured ? "已配置，留空则保留原值" : "请输入 API Key（可选）";
  elements.modelServiceProviderEnabled.checked = provider ? Boolean(provider.enabled) : true;
  elements.modelServiceProviderError.hidden = true;
  elements.modelServiceProviderDialog.showModal();
  window.setTimeout(() => elements.modelServiceProviderName.focus(), 0);
}

async function saveModelServiceModel(event) {
  event.preventDefault();
  elements.modelServiceModelError.hidden = true;
  const body = {
    name: elements.modelServiceModelName.value.trim(),
    upstream_id: elements.modelServiceModelUpstream.value.trim(),
    context_length: Number(elements.modelServiceModelContext.value),
    provider_id: elements.modelServiceModelProvider.value,
    enabled: elements.modelServiceModelEnabled.checked,
  };
  try {
    const path = editingModelServiceModel ? `/api/model-service/models/${encodeURIComponent(editingModelServiceModel.id)}` : "/api/model-service/models";
    const saved = await accountApi(path, { method: editingModelServiceModel ? "PATCH" : "POST", body: JSON.stringify(body) });
    if (editingModelServiceModel) {
      modelServiceModels = modelServiceModels.map((model) => model.id === saved.id ? saved : model);
    } else {
      modelServiceModels.push(saved);
    }
    renderModelServiceModels();
    renderModelServiceProviders();
    elements.modelServiceModelDialog.close();
    showToast(editingModelServiceModel ? "模型已更新" : "模型已添加");
  } catch (error) {
    elements.modelServiceModelError.textContent = error.message || "模型保存失败";
    elements.modelServiceModelError.hidden = false;
  }
}

async function saveModelServiceProvider(event) {
  event.preventDefault();
  elements.modelServiceProviderError.hidden = true;
  const body = {
    name: elements.modelServiceProviderName.value.trim(),
    provider_type: elements.modelServiceProviderType.value,
    base_url: elements.modelServiceProviderUrl.value.trim(),
    api_key: elements.modelServiceProviderKey.value,
    enabled: elements.modelServiceProviderEnabled.checked,
  };
  try {
    const path = editingModelServiceProvider ? `/api/model-service/providers/${encodeURIComponent(editingModelServiceProvider.id)}` : "/api/model-service/providers";
    const saved = await accountApi(path, { method: editingModelServiceProvider ? "PATCH" : "POST", body: JSON.stringify(body) });
    if (editingModelServiceProvider) {
      modelServiceProviders = modelServiceProviders.map((provider) => provider.id === saved.id ? saved : provider);
    } else {
      modelServiceProviders.push(saved);
    }
    renderModelServiceProviders();
    renderModelServiceModels();
    elements.modelServiceProviderDialog.close();
    showToast(editingModelServiceProvider ? "服务提供方已更新" : "服务提供方已添加");
  } catch (error) {
    elements.modelServiceProviderError.textContent = error.message || "服务提供方保存失败";
    elements.modelServiceProviderError.hidden = false;
  }
}

async function toggleModelServiceItem(type, id, enabled) {
  try {
    const path = type === "model" ? `/api/model-service/models/${encodeURIComponent(id)}` : `/api/model-service/providers/${encodeURIComponent(id)}`;
    const saved = await accountApi(path, { method: "PATCH", body: JSON.stringify({ enabled }) });
    if (type === "model") modelServiceModels = modelServiceModels.map((item) => item.id === id ? saved : item);
    else modelServiceProviders = modelServiceProviders.map((item) => item.id === id ? saved : item);
    renderModelServiceModels();
    renderModelServiceProviders();
    showToast(enabled ? "已启用" : "已停用");
  } catch (error) {
    showToast(error.message || "状态更新失败");
  }
}

async function deleteModelServiceItem(type, id) {
  const item = type === "model"
    ? modelServiceModels.find((entry) => entry.id === id)
    : modelServiceProviders.find((entry) => entry.id === id);
  if (!item || !window.confirm(`确定删除“${item.name}”吗？`)) return;
  try {
    const path = type === "model" ? `/api/model-service/models/${encodeURIComponent(id)}` : `/api/model-service/providers/${encodeURIComponent(id)}`;
    await accountApi(path, { method: "DELETE" });
    if (type === "model") modelServiceModels = modelServiceModels.filter((entry) => entry.id !== id);
    else modelServiceProviders = modelServiceProviders.filter((entry) => entry.id !== id);
    renderModelServiceModels();
    renderModelServiceProviders();
    showToast(type === "model" ? "模型已删除" : "服务提供方已删除");
  } catch (error) {
    showToast(error.message || "删除失败");
  }
}

async function testModelServiceProvider(providerId, button) {
  button.disabled = true;
  try {
    const result = await accountApi(`/api/model-service/providers/${encodeURIComponent(providerId)}/test`, { method: "POST", body: "{}" });
    showToast(result.message || (result.ok ? "配置已就绪" : "配置不可用"), result.ok ? "success" : "error");
  } catch (error) {
    showToast(error.message || "测试失败");
  } finally {
    button.disabled = false;
  }
}

function handleModelServiceAction(event) {
  const button = event.target.closest("[data-model-service-action]");
  if (!button) return;
  const id = button.dataset.modelServiceId;
  const action = button.dataset.modelServiceAction;
  if (action === "edit-model") openModelServiceModelForm(modelServiceModels.find((model) => model.id === id));
  else if (action === "delete-model") deleteModelServiceItem("model", id);
  else if (action === "toggle-model") toggleModelServiceItem("model", id, button.getAttribute("aria-checked") !== "true");
  else if (action === "edit-provider") openModelServiceProviderForm(modelServiceProviders.find((provider) => provider.id === id));
  else if (action === "delete-provider") deleteModelServiceItem("provider", id);
  else if (action === "toggle-provider") toggleModelServiceItem("provider", id, button.getAttribute("aria-checked") !== "true");
  else if (action === "test-provider") testModelServiceProvider(id, button);
}

function renderAccountSpaces() {
  const query = elements.accountSpaceSearch.value.trim().toLowerCase();
  const spaces = accountSpaces.filter((space) => space.name.toLowerCase().includes(query));
  if (!spaces.length) {
    const empty = document.createElement("p");
    empty.className = "account-space-empty";
    empty.textContent = "没有匹配的空间";
    elements.accountSpaceTableBody.replaceChildren(empty);
    return;
  }
  elements.accountSpaceTableBody.replaceChildren(...spaces.map(createAccountSpaceRow));
}

function createAccountSpaceRow(space) {
  const canManage = currentAccountUser?.role === "admin";
  const row = document.createElement("div");
  row.className = "account-space-row";
  row.setAttribute("role", "row");
  const name = document.createElement("button");
  name.type = "button";
  name.className = "account-space-name";
  name.textContent = space.name;
  name.addEventListener("click", () => { switchSpace(space.id); setView("chat"); showAgentPage(); });
  const description = document.createElement("span");
  description.className = "account-space-description";
  description.textContent = space.description || "-";
  const owner = document.createElement("span");
  owner.textContent = space.created_by || "demo.user";
  const created = document.createElement("span");
  created.textContent = formatAccountDate(space.created_at);
  const actions = document.createElement("div");
  actions.className = "account-space-actions";
  const enter = document.createElement("button");
  enter.type = "button";
  enter.textContent = "进入";
  enter.addEventListener("click", () => { switchSpace(space.id); setView("chat"); showAgentPage(); });
  const overview = document.createElement("button");
  overview.type = "button";
  overview.textContent = "概览";
  overview.title = "查看空间概览";
  overview.addEventListener("click", () => openSpaceOverview(space));
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "编辑";
  edit.disabled = !canManage;
  edit.title = canManage ? "编辑空间" : "需要管理员权限";
  edit.addEventListener("click", () => openSpaceForm(space));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "删除";
  remove.disabled = !canManage;
  remove.title = canManage ? "删除空间" : "需要管理员权限";
  remove.addEventListener("click", () => openSpaceDelete(space));
  actions.append(enter, overview, edit, remove);
  row.append(name, description, owner, created, actions);
  return row;
}

function openSpaceForm(space = null) {
  editingSpace = space;
  elements.spaceFormTitle.textContent = space ? "编辑空间" : "创建空间";
  elements.spaceFormSubmit.textContent = space ? "保存" : "创建";
  elements.spaceFormName.value = space?.name || "";
  elements.spaceFormDescription.value = space?.description || "";
  elements.spaceFormIcon.value = "";
  spaceFormIconValue = isSpaceImage(space?.icon) ? space.icon : "";
  spaceFormIconDirty = false;
  renderSpaceFormIcon(space?.name || "SP");
  elements.spaceFormError.hidden = true;
  elements.spaceFormDialog.showModal();
  window.setTimeout(() => elements.spaceFormName.focus(), 0);
}

function closeSpaceForm() {
  editingSpace = null;
  elements.spaceFormDialog.close();
}

function readSpaceIconFile(file) {
  if (!file) return;
  if (!/^image\/(?:png|jpeg|gif|webp|svg\+xml)$/i.test(file.type)) {
    elements.spaceFormError.textContent = "请选择 PNG、JPG、GIF、WEBP 或 SVG 图片";
    elements.spaceFormError.hidden = false;
    elements.spaceFormIcon.value = "";
    return;
  }
  if (file.size > 384 * 1024) {
    elements.spaceFormError.textContent = "空间 Icon 不能超过 384 KB";
    elements.spaceFormError.hidden = false;
    elements.spaceFormIcon.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    spaceFormIconValue = typeof reader.result === "string" ? reader.result : "";
    spaceFormIconDirty = Boolean(spaceFormIconValue);
    elements.spaceFormError.hidden = true;
    renderSpaceFormIcon(elements.spaceFormName.value.trim());
  });
  reader.addEventListener("error", () => {
    elements.spaceFormError.textContent = "空间 Icon 读取失败";
    elements.spaceFormError.hidden = false;
  });
  reader.readAsDataURL(file);
}

async function submitSpaceForm(event) {
  event.preventDefault();
  const name = elements.spaceFormName.value.trim();
  const description = elements.spaceFormDescription.value.trim();
  if (!name) {
    elements.spaceFormError.textContent = "请输入空间名称";
    elements.spaceFormError.hidden = false;
    return;
  }
  try {
    const wasEditing = Boolean(editingSpace);
    const path = editingSpace ? `/api/spaces/${encodeURIComponent(editingSpace.id)}` : "/api/spaces";
    const body = { name, description };
    if (spaceFormIconDirty) body.icon = spaceFormIconValue;
    const saved = await accountApi(path, {
      method: editingSpace ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    const index = accountSpaces.findIndex((space) => space.id === saved.id);
    if (index >= 0) accountSpaces[index] = saved;
    else accountSpaces.push(saved);
    closeSpaceForm();
    updateActiveSpaceDisplay();
    renderAccountSpaces();
    showToast(wasEditing ? "空间已更新" : "空间已创建");
  } catch (error) {
    elements.spaceFormError.textContent = error.message || "保存失败";
    elements.spaceFormError.hidden = false;
  }
}

function openSpaceDelete(space) {
  deletingSpace = space;
  elements.spaceDeleteName.textContent = space.name;
  elements.spaceDeleteError.hidden = true;
  elements.spaceDeleteDialog.showModal();
}

function closeSpaceDelete() {
  deletingSpace = null;
  elements.spaceDeleteDialog.close();
}

async function deleteSelectedSpace() {
  if (!deletingSpace) return;
  elements.spaceDeleteConfirm.disabled = true;
  try {
    const deletedId = deletingSpace.id;
    await accountApi(`/api/spaces/${encodeURIComponent(deletedId)}`, { method: "DELETE" });
    accountSpaces = accountSpaces.filter((space) => space.id !== deletedId);
    closeSpaceDelete();
    renderAccountSpaces();
    renderSpaceOptions();
    showToast("空间已删除");
  } catch (error) {
    elements.spaceDeleteError.textContent = error.message || "删除失败";
    elements.spaceDeleteError.hidden = false;
  } finally {
    elements.spaceDeleteConfirm.disabled = false;
  }
}

async function loadPlatformUsers() {
  elements.accountUserTableBody.setAttribute("aria-busy", "true");
  try {
    const [usersResult, roleResult] = await Promise.allSettled([
      accountApi("/api/users"),
      accountApi("/api/roles"),
    ]);
    if (usersResult.status !== "fulfilled") throw usersResult.reason;
    platformUsers = usersResult.value;
    if (roleResult.status === "fulfilled") setPlatformRoles(roleResult.value);
    renderAccountUsers();
  } catch (error) {
    const failed = document.createElement("p");
    failed.className = "account-user-empty";
    failed.textContent = error.message || "用户列表加载失败";
    elements.accountUserTableBody.replaceChildren(failed);
  } finally {
    elements.accountUserTableBody.removeAttribute("aria-busy");
  }
}

function setPlatformRoles(payload) {
  platformRoles = Array.isArray(payload) ? payload : listFrom(payload?.roles);
  roleModules = Array.isArray(payload?.modules) && payload.modules.length
    ? payload.modules
    : roleModules;
  sortPlatformRoles();
  renderUserRoleOptions();
}

function sortPlatformRoles() {
  const builtInOrder = { admin: 0, data_product_manager: 1, dw_engineer: 2 };
  platformRoles.sort((left, right) => {
    if (left.is_builtin !== right.is_builtin) return left.is_builtin ? -1 : 1;
    return (builtInOrder[left.id] ?? 99) - (builtInOrder[right.id] ?? 99)
      || String(left.created_at || "").localeCompare(String(right.created_at || ""))
      || String(left.name || "").localeCompare(String(right.name || ""));
  });
}

async function loadPlatformRoles() {
  elements.accountRoleTableBody.setAttribute("aria-busy", "true");
  try {
    setPlatformRoles(await accountApi("/api/roles"));
    renderAccountRoles();
  } catch (error) {
    const failed = document.createElement("p");
    failed.className = "account-role-empty";
    failed.textContent = error.message || "角色列表加载失败";
    elements.accountRoleTableBody.replaceChildren(failed);
  } finally {
    elements.accountRoleTableBody.removeAttribute("aria-busy");
  }
}

function renderUserRoleOptions() {
  if (!elements.userFormRole || !platformRoles.length) return;
  const selected = elements.userFormRole.value;
  elements.userFormRole.replaceChildren(...platformRoles.map((role) => new Option(role.name, role.id)));
  if (platformRoles.some((role) => role.id === selected)) elements.userFormRole.value = selected;
}

function moduleLabel(moduleId) {
  return roleModules.find((module) => module.id === moduleId)?.label || moduleId;
}

function renderAccountRoles() {
  const query = elements.accountRoleSearch.value.trim().toLowerCase();
  const roles = platformRoles.filter((role) =>
    [role.name, role.description, ...(role.module_ids || []).map(moduleLabel)]
      .some((value) => String(value || "").toLowerCase().includes(query))
  );
  if (!roles.length) {
    const empty = document.createElement("p");
    empty.className = "account-role-empty";
    empty.textContent = query ? "没有匹配的角色" : "暂无角色";
    elements.accountRoleTableBody.replaceChildren(empty);
    return;
  }
  elements.accountRoleTableBody.replaceChildren(...roles.map(createAccountRoleRow));
}

function createAccountRoleRow(role) {
  const row = document.createElement("div");
  row.className = "account-role-row";
  row.setAttribute("role", "row");
  const identity = document.createElement("div");
  identity.className = "account-role-identity";
  const name = document.createElement("strong");
  name.textContent = role.name;
  identity.append(name);
  if (role.is_builtin && role.id === "admin") {
    const badge = document.createElement("small");
    badge.textContent = "内置";
    identity.append(badge);
  }
  const description = document.createElement("span");
  description.className = "account-role-description";
  description.textContent = role.description || "-";
  const modules = document.createElement("span");
  modules.className = "account-role-modules";
  modules.textContent = (role.module_ids || []).map(moduleLabel).join("、") || "-";
  modules.title = modules.textContent;
  const created = document.createElement("span");
  created.textContent = formatAccountDate(role.created_at);
  const actions = document.createElement("div");
  actions.className = "account-role-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "编辑";
  edit.addEventListener("click", () => openRoleForm(role));
  actions.append(edit);
  row.append(identity, description, modules, created, actions);
  return row;
}

function openRoleForm(role = null) {
  editingRole = role;
  elements.roleFormTitle.textContent = role ? "编辑角色" : "新增角色";
  elements.roleFormName.value = role?.name || "";
  elements.roleFormDescription.value = role?.description || "";
  const selected = new Set(role?.module_ids || []);
  elements.roleFormModuleList.className = "";
  elements.roleFormModuleList.replaceChildren(...roleModules.map((module) => {
    const option = document.createElement("label");
    option.className = "role-form-module-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = module.id;
    checkbox.checked = selected.has(module.id);
    const label = document.createElement("span");
    label.textContent = module.label;
    option.append(checkbox, label);
    return option;
  }));
  elements.roleFormConfirm.textContent = role ? "保存" : "创建角色";
  elements.roleFormError.hidden = true;
  elements.roleFormDialog.showModal();
  window.setTimeout(() => elements.roleFormName.focus(), 0);
}

function closeRoleForm() {
  editingRole = null;
  elements.roleFormDialog.close();
}

async function submitRoleForm(event) {
  event.preventDefault();
  const name = elements.roleFormName.value.trim();
  const description = elements.roleFormDescription.value.trim();
  const moduleIds = [...elements.roleFormModuleList.querySelectorAll('input[type="checkbox"]:checked')]
    .map((checkbox) => checkbox.value);
  if (!name || !moduleIds.length) {
    elements.roleFormError.textContent = !name ? "请输入角色名称" : "请至少选择一个功能模块";
    elements.roleFormError.hidden = false;
    return;
  }
  elements.roleFormConfirm.disabled = true;
  try {
    const wasEditing = Boolean(editingRole);
    const path = wasEditing ? `/api/roles/${encodeURIComponent(editingRole.id)}` : "/api/roles";
    const saved = await accountApi(path, {
      method: wasEditing ? "PATCH" : "POST",
      body: JSON.stringify({ name, description, module_ids: moduleIds }),
    });
    const index = platformRoles.findIndex((role) => role.id === saved.id);
    if (index >= 0) platformRoles[index] = saved;
    else platformRoles.push(saved);
    sortPlatformRoles();
    closeRoleForm();
    renderAccountRoles();
    renderUserRoleOptions();
    showToast(wasEditing ? "角色已更新" : "角色已创建");
  } catch (error) {
    elements.roleFormError.textContent = error.message || "角色保存失败";
    elements.roleFormError.hidden = false;
  } finally {
    elements.roleFormConfirm.disabled = false;
  }
}

function spaceNamesForIds(spaceIds) {
  return listFrom(spaceIds).map((id) => accountSpaces.find((space) => space.id === id)?.name || id).join("、") || "-";
}

function renderAccountUsers() {
  const query = elements.accountUserSearch.value.trim().toLowerCase();
  const users = platformUsers.filter((user) =>
    [user.username, user.role_label, spaceNamesForIds(user.space_ids)]
      .some((value) => String(value || "").toLowerCase().includes(query))
  );
  if (!users.length) {
    const empty = document.createElement("p");
    empty.className = "account-user-empty";
    empty.textContent = query ? "没有匹配的用户" : "暂无用户";
    elements.accountUserTableBody.replaceChildren(empty);
    return;
  }
  elements.accountUserTableBody.replaceChildren(...users.map(createAccountUserRow));
}

function createAccountUserRow(user) {
  const row = document.createElement("div");
  row.className = "account-user-row";
  row.setAttribute("role", "row");
  const identity = document.createElement("div");
  identity.className = "account-user-identity";
  const avatar = document.createElement("span");
  avatar.className = "account-user-avatar";
  avatar.textContent = accountInitials(user.username);
  const username = document.createElement("span");
  username.textContent = user.username;
  identity.append(avatar, username);
  const role = document.createElement("span");
  role.className = "account-user-role";
  role.textContent = user.role_label;
  const spaces = document.createElement("span");
  spaces.textContent = spaceNamesForIds(user.space_ids);
  const created = document.createElement("span");
  created.textContent = formatAccountDate(user.created_at);
  const actions = document.createElement("div");
  actions.className = "account-user-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "编辑";
  edit.addEventListener("click", () => openUserForm(user));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "删除";
  remove.disabled = user.username === currentAccountUser?.username;
  remove.title = remove.disabled ? "不能删除当前登录用户" : "删除用户";
  remove.addEventListener("click", () => openUserDelete(user));
  actions.append(edit, remove);
  row.append(identity, role, spaces, created, actions);
  return row;
}

function openUserForm(user = null) {
  editingUser = user;
  renderUserRoleOptions();
  elements.userFormTitle.textContent = user ? "编辑用户" : "新增用户";
  elements.userFormName.value = user?.username || "";
  elements.userFormName.disabled = Boolean(user);
  elements.userFormPassword.value = "";
  elements.userPasswordRow.hidden = Boolean(user);
  elements.userFormRole.value = user?.role || "dw_engineer";
  const selected = new Set(user?.space_ids || [activeSpaceId]);
  elements.userFormSpaceList.replaceChildren(...accountSpaces.map((space) => {
    const option = document.createElement("label");
    option.className = "user-form-space-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = space.id;
    checkbox.checked = selected.has(space.id);
    const label = document.createElement("span");
    label.textContent = space.name;
    option.append(checkbox, label);
    return option;
  }));
  elements.userFormConfirm.textContent = user ? "保存" : "创建用户";
  elements.userFormError.hidden = true;
  elements.userFormDialog.showModal();
  window.setTimeout(() => (user ? elements.userFormRole : elements.userFormName).focus(), 0);
}

function closeUserForm() {
  editingUser = null;
  elements.userFormDialog.close();
}

async function submitUserForm(event) {
  event.preventDefault();
  const username = elements.userFormName.value.trim();
  const password = elements.userFormPassword.value;
  const role = elements.userFormRole.value;
  const spaceIds = [...elements.userFormSpaceList.querySelectorAll('input[type="checkbox"]:checked')]
    .map((checkbox) => checkbox.value);
  if (!username || (!editingUser && password.length < 8) || !spaceIds.length) {
    elements.userFormError.textContent = !editingUser && password.length < 8
      ? "初始密码至少需要 8 个字符"
      : "请完整填写用户名称、角色和空间";
    elements.userFormError.hidden = false;
    return;
  }
  elements.userFormConfirm.disabled = true;
  try {
    const path = editingUser ? `/api/users/${encodeURIComponent(editingUser.username)}` : "/api/users";
    const body = editingUser ? { role, space_ids: spaceIds } : { username, password, role, space_ids: spaceIds };
    const saved = await accountApi(path, { method: editingUser ? "PATCH" : "POST", body: JSON.stringify(body) });
    const index = platformUsers.findIndex((user) => user.username === saved.username);
    if (index >= 0) platformUsers[index] = saved;
    else platformUsers.push(saved);
    platformUsers.sort((left, right) => left.created_at.localeCompare(right.created_at));
    const wasEditing = Boolean(editingUser);
    closeUserForm();
    if (saved.username === currentAccountUser?.username) setCurrentAccountUser(saved);
    renderAccountUsers();
    showToast(wasEditing ? "用户已更新" : "用户已创建");
  } catch (error) {
    elements.userFormError.textContent = error.message || "用户保存失败";
    elements.userFormError.hidden = false;
  } finally {
    elements.userFormConfirm.disabled = false;
  }
}

function openUserDelete(user) {
  deletingUser = user;
  elements.userDeleteName.textContent = user.username;
  elements.userDeleteError.hidden = true;
  elements.userDeleteDialog.showModal();
}

function closeUserDelete() {
  deletingUser = null;
  elements.userDeleteDialog.close();
}

async function deleteSelectedUser() {
  if (!deletingUser) return;
  elements.userDeleteConfirm.disabled = true;
  try {
    const username = deletingUser.username;
    await accountApi(`/api/users/${encodeURIComponent(username)}`, { method: "DELETE" });
    platformUsers = platformUsers.filter((user) => user.username !== username);
    closeUserDelete();
    renderAccountUsers();
    showToast("用户已删除");
  } catch (error) {
    elements.userDeleteError.textContent = error.message || "用户删除失败";
    elements.userDeleteError.hidden = false;
  } finally {
    elements.userDeleteConfirm.disabled = false;
  }
}

function logoutAccount() {
  closeWorkspaceMenu();
  showAgentPage();
  showToast("已退出当前账号");
}

async function loadNotificationAdmin() {
  elements.notificationRouteBody.setAttribute("aria-busy", "true");
  elements.notificationDeliveryBody.setAttribute("aria-busy", "true");
  try {
    [notificationSettings, notificationDeliveries, platformUsers, notificationMembers] = await Promise.all([
      accountApi("/api/notifications/settings"),
      accountApi("/api/notifications/deliveries"),
      accountApi("/api/users"),
      accountApi("/api/notifications/members"),
    ]);
    renderNotificationSettings();
    renderNotificationDeliveries();
  } catch (error) {
    showToast(error.message || "通知配置加载失败");
  } finally {
    elements.notificationRouteBody.removeAttribute("aria-busy");
    elements.notificationDeliveryBody.removeAttribute("aria-busy");
  }
}

function renderNotificationSettings() {
  if (!notificationSettings) return;
  elements.notificationEnabled.checked = Boolean(notificationSettings.enabled);
  elements.notificationPublicUrl.value = notificationSettings.public_base_url || "";
  elements.notificationAppStatus.textContent = notificationSettings.app_configured ? "应用凭据已配置" : "应用凭据未配置";
  elements.notificationAppStatus.classList.toggle("is-ready", Boolean(notificationSettings.app_configured));
  elements.notificationEventInputs.forEach((input) => {
    input.checked = Boolean(notificationSettings.events?.[input.dataset.notificationEvent]);
  });
  renderNotificationTemplateEditor();
  renderNotificationMentionMappings();
  renderNotificationRoutes();
}

function notificationTemplate() {
  return notificationSettings?.templates?.[selectedNotificationTemplateEvent] || null;
}

function notificationTemplateValues() {
  const eventLabel = notificationSettings?.event_labels?.[selectedNotificationTemplateEvent] || "需求评审产物待确认";
  const final = selectedNotificationTemplateEvent === "workflow_completed";
  const engineers = platformUsers
    .filter((user) => user.role === "dw_engineer" && (user.space_ids || []).includes(activeSpaceId))
    .map((user) => notificationSettings?.user_mentions?.[user.username]?.display_name || user.username);
  return {
    skill_name: "指标口径调研",
    skill_notes: "补充指标查询示例并完善输入参数说明",
    review_reason: "发布内容需要补充输入参数说明",
    skill_version: "v1.2.0",
    reviewer: engineers[0] || currentAccountUser?.username || "demo.user",
    requirement_name: "广告收入日报指标补充",
    requirement_id: "REQ-20260807-DEMO",
    workspace_name: currentSpace()?.name || "Demo",
    stage_name: final ? "完整流程" : eventLabel.replace(/产物待确认$/, ""),
    creator: notificationSettings?.user_mentions?.[currentAccountUser?.username]?.display_name
      || currentAccountUser?.username || "demo.user",
    engineers: engineers.map((name) => `@${name}`).join(" ") || "未分配",
  };
}

function renderNotificationTemplateText(text, values) {
  return String(text || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name) => values[name] ?? match);
}

function renderNotificationPreviewValue(fieldId, value) {
  const text = String(value || "-");
  if (fieldId !== "requirement_title") return escapeHtml(text);
  let html = "";
  let position = 0;
  const pattern = /https?:\/\/[^\s<>]+/g;
  for (const match of text.matchAll(pattern)) {
    const rawUrl = match[0];
    const url = rawUrl.replace(/[.,;:!?，。；！？)]+$/, "");
    html += escapeHtml(text.slice(position, match.index));
    html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    html += escapeHtml(rawUrl.slice(url.length));
    position = match.index + rawUrl.length;
  }
  return html + escapeHtml(text.slice(position));
}

function captureNotificationTemplate() {
  const template = notificationTemplate();
  if (!template || !elements.notificationTemplateFields.children.length) return;
  template.title = elements.notificationTemplateCardTitle.value.trim();
  template.status = elements.notificationTemplateStatus.value.trim();
  template.theme = elements.notificationTemplateThemes.querySelector("input:checked")?.value || "blue";
  template.mention_creator = elements.notificationTemplateMention.checked;
  template.button_enabled = elements.notificationTemplateButtonEnabled.checked;
  template.button_label = elements.notificationTemplateButtonLabel.value.trim();
  template.fields = [...elements.notificationTemplateFields.querySelectorAll(".notification-field-row")]
    .filter((row) => row.querySelector("input").checked)
    .map((row) => row.dataset.fieldId);
}

function moveNotificationField(button, direction) {
  const row = button.closest(".notification-field-row");
  const sibling = direction < 0 ? row?.previousElementSibling : row?.nextElementSibling;
  if (!row || !sibling) return;
  if (direction < 0) sibling.before(row);
  else sibling.after(row);
  captureNotificationTemplate();
  renderNotificationCardPreview();
}

function renderNotificationTemplateEditor({ renderEventOptions = true } = {}) {
  if (!notificationSettings?.templates) return;
  if (!notificationSettings.templates[selectedNotificationTemplateEvent]) {
    selectedNotificationTemplateEvent = Object.keys(notificationSettings.templates)[0] || "requirement_review";
  }
  if (renderEventOptions) {
    elements.notificationTemplateEvent.replaceChildren(...Object.entries(notificationSettings.event_labels || {}).map(([id, label]) => (
      new Option(label, id, id === selectedNotificationTemplateEvent, id === selectedNotificationTemplateEvent)
    )));
  }
  const template = notificationTemplate();
  if (!template) return;
  const isSkillNotification = selectedNotificationTemplateEvent.startsWith("skill_publish_");
  elements.notificationTemplateCardTitle.value = template.title || "";
  elements.notificationTemplateStatus.value = template.status || "";
  elements.notificationTemplateStatusField.hidden = isSkillNotification;
  elements.notificationTemplateMention.checked = Boolean(template.mention_creator);
  elements.notificationTemplateMentionLabel.textContent = selectedNotificationTemplateEvent.startsWith("skill_publish_")
    ? "提交者使用 @ 提醒"
    : "需求方使用 @ 提醒";
  elements.notificationTemplateButtonEnabled.checked = Boolean(template.button_enabled);
  elements.notificationTemplateButtonLabel.value = template.button_label || "查看详情";
  elements.notificationTemplateButtonLabel.disabled = !template.button_enabled;

  const themeColors = {
    blue: "#3370ff", wathet: "#5b8ff9", turquoise: "#00a6a6", green: "#34a853", yellow: "#d99a00",
    orange: "#f97316", red: "#dc3d4b", carmine: "#c43b75", violet: "#7c4dce", grey: "#64748b",
  };
  elements.notificationTemplateThemes.replaceChildren(...Object.entries(notificationSettings.card_themes || {}).map(([id, label]) => {
    const option = document.createElement("label");
    option.className = "notification-theme-option";
    option.title = label;
    option.innerHTML = `<input type="radio" name="notification-card-theme" value="${escapeHtml(id)}" ${template.theme === id ? "checked" : ""}><span style="--theme-color:${themeColors[id] || "#64748b"}"></span>`;
    return option;
  }));

  elements.notificationTemplateVariables.replaceChildren(...Object.entries(notificationSettings.card_variables || {}).map(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.templateVariable = id;
    button.textContent = `{{${id}}}`;
    button.title = label;
    return button;
  }));

  const allowedFieldIds = Object.keys(notificationSettings.card_fields || {})
    .filter((id) => !(isSkillNotification && id === "status"))
    .filter((id) => id !== "review_reason" || selectedNotificationTemplateEvent === "skill_publish_rejected");
  const selectedFields = (Array.isArray(template.fields) ? template.fields : [])
    .filter((id) => allowedFieldIds.includes(id));
  const fieldIds = [...selectedFields, ...allowedFieldIds.filter((id) => !selectedFields.includes(id))];
  elements.notificationTemplateFields.replaceChildren(...fieldIds.map((fieldId, index) => {
    const row = document.createElement("div");
    row.className = "notification-field-row";
    row.dataset.fieldId = fieldId;
    row.innerHTML = `<label><input type="checkbox" ${selectedFields.includes(fieldId) ? "checked" : ""}><span>${escapeHtml(notificationSettings.card_fields[fieldId] || fieldId)}</span></label><div><button type="button" data-field-move="-1" aria-label="上移" title="上移" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-field-move="1" aria-label="下移" title="下移" ${index === fieldIds.length - 1 ? "disabled" : ""}>↓</button></div>`;
    return row;
  }));

  elements.notificationTemplateTestSpace.replaceChildren(...accountSpaces.map((space) => {
    const route = notificationSettings.routes?.[space.id];
    return new Option(`${space.name}${route?.chat_id ? ` / ${route.chat_name || route.chat_id}` : " / 未配置群"}`, space.id, false, space.id === activeSpaceId);
  }));
  elements.notificationTemplateTest.disabled = !notificationSettings.routes?.[elements.notificationTemplateTestSpace.value]?.chat_id;
  renderNotificationCardPreview();
}

function renderNotificationCardPreview() {
  captureNotificationTemplate();
  const template = notificationTemplate();
  if (!template) return;
  const values = notificationTemplateValues();
  const fieldValues = {
    skill_title: values.skill_name,
    skill_notes: values.skill_notes,
    review_reason: values.review_reason,
    skill_version: values.skill_version,
    submitter: values.creator,
    reviewer: `@${values.reviewer}`,
    requirement_title: values.requirement_name,
    requirement_id: values.requirement_id,
    workspace_name: values.workspace_name,
    status: renderNotificationTemplateText(template.status, values),
    created_by: template.mention_creator ? `@${values.creator}` : values.creator,
    dw_engineers: values.engineers,
    stage_label: values.stage_name,
  };
  const rows = [];
  let shortRow = [];
  (template.fields || []).forEach((fieldId) => {
    if (["requirement_title", "skill_title", "skill_notes", "review_reason", "status"].includes(fieldId)) {
      if (shortRow.length) rows.push(shortRow);
      shortRow = [];
      rows.push([fieldId]);
      return;
    }
    shortRow.push(fieldId);
    if (shortRow.length === 2) {
      rows.push(shortRow);
      shortRow = [];
    }
  });
  if (shortRow.length) rows.push(shortRow);
  const fields = rows.map((row, index) => {
    const content = row.map((fieldId) => `<div class="notification-preview-field"><strong>${escapeHtml(notificationSettings.card_fields?.[fieldId] || fieldId)}</strong><span>${renderNotificationPreviewValue(fieldId, fieldValues[fieldId])}</span></div>`).join("");
    const divider = row.includes("status") && index < rows.length - 1 ? '<hr class="notification-preview-divider">' : "";
    return `<div class="notification-preview-row ${row.length === 1 ? "is-single" : ""}">${content}</div>${divider}`;
  }).join("");
  const button = template.button_enabled ? `<div class="notification-preview-actions"><span>${escapeHtml(template.button_label || "查看详情")}</span></div>` : "";
  elements.notificationCardPreview.innerHTML = `<div class="notification-preview-header is-${escapeHtml(template.theme || "blue")}"><strong>${escapeHtml(renderNotificationTemplateText(template.title, values) || "卡片标题")}</strong></div><div class="notification-preview-body">${fields}</div>${button}`;
}

function renderNotificationMentionMappings() {
  const mappings = notificationSettings?.user_mentions || {};
  const rows = platformUsers.map((user) => {
    const mapping = mappings[user.username] || {};
    const row = document.createElement("div");
    row.className = "notification-mention-row";
    row.dataset.username = user.username;
    row.setAttribute("role", "row");
    const members = [...notificationMembers];
    if (mapping.open_id && !members.some((member) => member.open_id === mapping.open_id)) {
      members.push({ open_id: mapping.open_id, name: mapping.display_name || mapping.open_id, chat_names: [] });
    }
    const options = [`<option value="">请选择群成员</option>`, ...members.map((member) => `<option value="${escapeHtml(member.open_id)}" data-member-name="${escapeHtml(member.name)}" ${member.open_id === mapping.open_id ? "selected" : ""}>${escapeHtml(member.name)}${member.chat_names?.length ? ` · ${escapeHtml(member.chat_names.join(" / "))}` : ""}</option>`)].join("");
    row.innerHTML = `<strong>${escapeHtml(user.username)}</strong><select data-mention-member aria-label="${escapeHtml(user.username)} 的飞书群成员">${options}</select><input data-mention-open-id type="text" maxlength="160" value="${escapeHtml(mapping.open_id || "")}" placeholder="ou_xxx" aria-label="${escapeHtml(user.username)} 的飞书 open_id"><span class="notification-mention-state ${mapping.open_id ? "is-ready" : ""}">${mapping.open_id ? "已映射" : "未映射"}</span>`;
    const memberSelect = row.querySelector("[data-mention-member]");
    const openIdInput = row.querySelector("[data-mention-open-id]");
    memberSelect.addEventListener("change", () => {
      openIdInput.value = memberSelect.value;
      openIdInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    openIdInput.addEventListener("input", (event) => {
      const state = row.querySelector(".notification-mention-state");
      state.textContent = event.target.value.trim() ? "待保存" : "未映射";
      state.classList.toggle("is-ready", Boolean(event.target.value.trim()));
    });
    return row;
  });
  elements.notificationMentionBody.replaceChildren(...rows);
  const configured = Object.values(mappings).filter((mapping) => mapping.open_id).length;
  elements.notificationMentionSummary.textContent = `${configured}/${platformUsers.length} 个用户已映射`;
}

function notificationChatOptions(savedRoute = {}) {
  const chats = [...notificationChats];
  if (savedRoute.chat_id && !chats.some((chat) => chat.chat_id === savedRoute.chat_id)) {
    chats.push({ chat_id: savedRoute.chat_id, name: savedRoute.chat_name || savedRoute.chat_id });
  }
  return chats.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

function renderNotificationRoutes() {
  if (!notificationSettings) return;
  const rows = accountSpaces.map((space) => {
    const route = notificationSettings.routes?.[space.id] || {};
    const row = document.createElement("div");
    row.className = "notification-route-row";
    row.dataset.spaceId = space.id;
    row.dataset.savedChatId = route.chat_id || "";
    row.dataset.savedChatName = route.chat_name || "";
    row.setAttribute("role", "row");

    const identity = document.createElement("div");
    identity.className = "notification-space-identity";
    const badge = document.createElement("span");
    badge.textContent = space.icon || space.name.slice(0, 2).toUpperCase();
    badge.style.background = space.color || "#e2e8f0";
    const name = document.createElement("strong");
    name.textContent = space.name;
    identity.append(badge, name);

    const select = document.createElement("select");
    select.setAttribute("aria-label", `${space.name} 的目标飞书群`);
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "未配置";
    select.append(empty);
    notificationChatOptions(route).forEach((chat) => {
      const option = document.createElement("option");
      option.value = chat.chat_id;
      option.dataset.chatName = chat.name;
      option.textContent = chat.name;
      option.selected = chat.chat_id === route.chat_id;
      select.append(option);
    });

    const chatId = document.createElement("input");
    chatId.type = "text";
    chatId.maxLength = 160;
    chatId.pattern = "oc_[A-Za-z0-9_-]+";
    chatId.value = route.chat_id || "";
    chatId.placeholder = "oc_xxx";
    chatId.dataset.notificationChatId = "";
    chatId.setAttribute("aria-label", `${space.name} 的飞书群会话 ID`);
    select.addEventListener("change", () => {
      chatId.value = select.value;
      chatId.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const actions = document.createElement("div");
    const test = document.createElement("button");
    test.type = "button";
    test.className = "notification-row-action";
    test.disabled = !chatId.value.trim();
    test.innerHTML = `${icon("send")}<span>测试</span>`;
    chatId.addEventListener("input", () => {
      const value = chatId.value.trim();
      const matchingOption = [...select.options].find((option) => option.value === value);
      select.value = matchingOption ? value : "";
      chatId.setCustomValidity(value && !/^oc_[A-Za-z0-9_-]+$/.test(value) ? "请输入以 oc_ 开头的飞书群会话 ID" : "");
      test.disabled = !value || !chatId.checkValidity();
    });
    test.addEventListener("click", () => sendNotificationTest(space.id, test));
    actions.append(test);

    row.append(identity, select, chatId, actions);
    return row;
  });
  elements.notificationRouteBody.replaceChildren(...rows);
  const configured = Object.values(notificationSettings.routes || {}).filter((route) => route.chat_id).length;
  elements.notificationChatSummary.textContent = `${configured}/${accountSpaces.length} 个空间已配置`;
  refreshIcons();
}

function notificationSettingsPayload() {
  captureNotificationTemplate();
  const events = {};
  elements.notificationEventInputs.forEach((input) => {
    events[input.dataset.notificationEvent] = input.checked;
  });
  const routes = {};
  elements.notificationRouteBody.querySelectorAll(".notification-route-row").forEach((row) => {
    const select = row.querySelector("select");
    const input = row.querySelector("[data-notification-chat-id]");
    const chatId = input.value.trim();
    if (!chatId) return;
    const option = [...select.options].find((item) => item.value === chatId);
    const savedName = chatId === row.dataset.savedChatId ? row.dataset.savedChatName : "";
    routes[row.dataset.spaceId] = {
      chat_id: chatId,
      chat_name: option?.dataset.chatName || savedName || chatId,
    };
  });
  const userMentions = {};
  elements.notificationMentionBody.querySelectorAll(".notification-mention-row").forEach((row) => {
    const openId = row.querySelector("[data-mention-open-id]").value.trim();
    if (!openId) return;
    userMentions[row.dataset.username] = {
      open_id: openId,
      display_name: row.querySelector("[data-mention-member]").selectedOptions[0]?.dataset.memberName || row.dataset.username,
    };
  });
  return {
    enabled: elements.notificationEnabled.checked,
    public_base_url: elements.notificationPublicUrl.value.trim(),
    events,
    routes,
    user_mentions: userMentions,
    templates: notificationSettings.templates,
  };
}

async function saveNotificationSettings({ quiet = false } = {}) {
  const invalidChatId = [...elements.notificationRouteBody.querySelectorAll("[data-notification-chat-id]")]
    .find((input) => input.value.trim() && !input.checkValidity());
  if (invalidChatId) {
    invalidChatId.reportValidity();
    if (!quiet) showToast("请检查飞书群会话 ID");
    return false;
  }
  elements.notificationSave.disabled = true;
  try {
    notificationSettings = await accountApi("/api/notifications/settings", {
      method: "PUT",
      body: JSON.stringify(notificationSettingsPayload()),
    });
    renderNotificationSettings();
    if (!quiet) showToast("通知设置已保存");
    return true;
  } catch (error) {
    showToast(error.message || "通知设置保存失败");
    return false;
  } finally {
    elements.notificationSave.disabled = false;
  }
}

async function loadNotificationChats() {
  elements.notificationRefreshChats.disabled = true;
  elements.notificationRefreshChats.classList.add("is-loading");
  try {
    [notificationChats, notificationMembers] = await Promise.all([
      accountApi("/api/notifications/chats"),
      accountApi("/api/notifications/members"),
    ]);
    renderNotificationRoutes();
    renderNotificationMentionMappings();
    showToast(`已加载 ${notificationChats.length} 个飞书群、${notificationMembers.length} 名群成员`);
  } catch (error) {
    showToast(error.message || "飞书群列表加载失败");
  } finally {
    elements.notificationRefreshChats.disabled = false;
    elements.notificationRefreshChats.classList.remove("is-loading");
  }
}

async function sendNotificationTest(spaceId, button, eventType = selectedNotificationTemplateEvent) {
  button.disabled = true;
  const saved = await saveNotificationSettings({ quiet: true });
  if (!saved) {
    button.disabled = false;
    return;
  }
  try {
    await accountApi("/api/notifications/test", {
      method: "POST",
      body: JSON.stringify({ space_id: spaceId, event_type: eventType }),
    });
    await loadNotificationDeliveries();
    showToast("测试通知已发送");
  } catch (error) {
    await loadNotificationDeliveries().catch(() => {});
    showToast(error.message || "测试通知发送失败");
  } finally {
    const select = button.closest(".notification-route-row")?.querySelector("select");
    button.disabled = select
      ? !select.value
      : !notificationSettings?.routes?.[elements.notificationTemplateTestSpace.value]?.chat_id;
  }
}

async function loadNotificationDeliveries() {
  elements.notificationRefreshDeliveries.disabled = true;
  try {
    notificationDeliveries = await accountApi("/api/notifications/deliveries");
    renderNotificationDeliveries();
  } finally {
    elements.notificationRefreshDeliveries.disabled = false;
  }
}

function renderNotificationDeliveries() {
  if (!notificationDeliveries.length) {
    const empty = document.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = "暂无发送记录";
    elements.notificationDeliveryBody.replaceChildren(empty);
    return;
  }
  const rows = notificationDeliveries.map((delivery) => {
    const row = document.createElement("div");
    row.className = "notification-delivery-row";
    row.setAttribute("role", "row");
    const summary = document.createElement("span");
    summary.className = "notification-delivery-summary";
    const title = document.createElement("strong");
    title.textContent = delivery.event_label || "飞书通知";
    const requirement = document.createElement("small");
    requirement.textContent = delivery.requirement_id === "TEST"
      ? "连通性测试"
      : `${delivery.requirement_title || "数仓研发需求"} · ${delivery.requirement_id || "-"}`;
    summary.append(title, requirement);
    const target = document.createElement("span");
    target.className = "notification-delivery-target";
    target.textContent = `${delivery.workspace_name || delivery.workspace_id || "-"} / ${delivery.chat_name || delivery.chat_id || "-"}`;
    const status = document.createElement("span");
    status.className = `notification-delivery-status is-${delivery.status || "pending"}`;
    status.textContent = delivery.status === "sent" ? "已发送" : delivery.status === "failed" ? "失败" : "发送中";
    if (delivery.error) status.title = delivery.error;
    const updated = document.createElement("span");
    updated.className = "notification-delivery-time";
    updated.textContent = formatAccountDate(delivery.updated_at);
    const actions = document.createElement("div");
    if (delivery.status === "failed") {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "notification-row-action";
      retry.innerHTML = `${icon("rotate-cw")}<span>重试</span>`;
      retry.addEventListener("click", () => retryNotificationDelivery(delivery.id, retry));
      actions.append(retry);
    } else {
      actions.textContent = "-";
    }
    row.append(summary, target, status, updated, actions);
    return row;
  });
  elements.notificationDeliveryBody.replaceChildren(...rows);
  refreshIcons();
}

async function retryNotificationDelivery(deliveryId, button) {
  button.disabled = true;
  try {
    await accountApi(`/api/notifications/deliveries/${encodeURIComponent(deliveryId)}/retry`, { method: "POST" });
    showToast("通知已重新发送");
  } catch (error) {
    showToast(error.message || "通知重试失败");
  } finally {
    await loadNotificationDeliveries().catch(() => {});
  }
}

function setSelectedModel(model) {
  const nextModel = String(model || "").trim();
  if (!nextModel) return;
  appState.selectedModel = nextModel;
  elements.modelName.textContent = nextModel;
  elements.modelName.title = nextModel;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, nextModel);
  } catch (_error) {
    // The selected model remains active for this page session.
  }
  renderModelOptions();
}

function renderModelOptions() {
  if (!elements.modelOptions) return;
  const query = String(elements.modelSearchInput?.value || "").trim().toLowerCase();
  const models = appState.availableModels.filter((model) => model.toLowerCase().includes(query));
  elements.modelOptions.replaceChildren();
  if (!models.length) {
    elements.modelOptions.innerHTML = '<p class="model-empty">未找到匹配的模型</p>';
    return;
  }
  models.forEach((model) => {
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.model = model;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(model === appState.selectedModel));
    option.innerHTML = `<span class="model-dot">AI</span><span title="${escapeHtml(model)}">${escapeHtml(model)}</span>${model === appState.selectedModel ? icon("check") : "<span></span>"}`;
    option.addEventListener("click", () => {
      setSelectedModel(model);
      closeModelMenu();
      elements.modelButton.focus();
    });
    elements.modelOptions.appendChild(option);
  });
  refreshIcons();
}

function openModelMenu() {
  elements.modelMenu.hidden = false;
  elements.modelButton.setAttribute("aria-expanded", "true");
  elements.modelSearchInput.value = "";
  renderModelOptions();
  window.requestAnimationFrame(() => elements.modelSearchInput.focus());
}

function closeModelMenu() {
  elements.modelMenu.hidden = true;
  elements.modelButton.setAttribute("aria-expanded", "false");
}

function selectedTaskType() {
  return appState.quickTasks.find((task) => task.id === appState.activeTaskId) || defaultTaskType;
}

function renderTaskTypeButton() {
  const selected = selectedTaskType();
  elements.taskTypeIcon.innerHTML = icon(selected.icon || taskIcons[selected.id] || "blocks");
  elements.taskTypeName.textContent = selected.label;
  elements.taskTypeButton.title = selected.description;
  renderTaskTypeOptions();
  refreshIcons();
}

function renderTaskTypeOptions() {
  const tasks = [defaultTaskType, ...appState.quickTasks];
  elements.taskTypeMenu.replaceChildren();
  tasks.forEach((task) => {
    const selected = task.id === appState.activeTaskId;
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.taskType = task.id;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(selected));
    option.innerHTML = `
      <span class="task-type-option-icon">${icon(task.icon || taskIcons[task.id] || "blocks")}</span>
      <span class="task-type-option-copy"><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.description)}</small></span>
      <span class="task-type-option-check">${selected ? icon("check") : ""}</span>`;
    option.addEventListener("click", () => selectTaskType(task.id));
    elements.taskTypeMenu.appendChild(option);
  });
  refreshIcons();
}

function openTaskTypeMenu() {
  closeModelMenu();
  renderTaskTypeOptions();
  elements.taskTypeMenu.hidden = false;
  elements.taskTypeButton.setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => elements.taskTypeMenu.querySelector('[aria-selected="true"]')?.focus());
}

function closeTaskTypeMenu() {
  elements.taskTypeMenu.hidden = true;
  elements.taskTypeButton.setAttribute("aria-expanded", "false");
}

function selectTaskType(taskId) {
  const nextTask = appState.quickTasks.find((task) => task.id === taskId) || null;
  closeTaskTypeMenu();
  if ((nextTask?.id || "") !== appState.activeTaskId) {
    startNewChat(nextTask);
  } else {
    renderTaskTypeButton();
    elements.taskTypeButton.focus();
  }
}

function formatInline(value) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(source) {
  const codeBlocks = [];
  const withTokens = String(source ?? "").replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_match, language, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(`<pre><code data-language="${escapeHtml(language.trim())}">${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`);
    return `\n@@AIDW_CODE_${index}@@\n`;
  });

  const lines = escapeHtml(withTokens).split("\n");
  const output = [];
  let listType = "";

  function closeList() {
    if (listType) output.push(`</${listType}>`);
    listType = "";
  }

  function tableCells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function isTableSeparator(line) {
    const cells = tableCells(line);
    return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trimEnd();
    const codeMatch = line.trim().match(/^@@AIDW_CODE_(\d+)@@$/);
    if (codeMatch) {
      closeList();
      output.push(codeBlocks[Number(codeMatch[1])] || "");
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.includes("|") && lineIndex + 1 < lines.length && isTableSeparator(lines[lineIndex + 1])) {
      closeList();
      const headings = tableCells(line);
      lineIndex += 1;
      const rows = [];
      while (lineIndex + 1 < lines.length) {
        const candidate = lines[lineIndex + 1].trim();
        if (!candidate || !candidate.includes("|") || candidate.startsWith("@@AIDW_CODE_")) break;
        lineIndex += 1;
        rows.push(tableCells(lines[lineIndex]));
      }
      output.push(`<table><thead><tr>${headings.map((cell) => `<th>${formatInline(cell)}</th>`).join("")}</tr></thead><tbody>`);
      rows.forEach((row) => output.push(`<tr>${headings.map((_cell, index) => `<td>${formatInline(row[index] || "")}</td>`).join("")}</tr>`));
      output.push("</tbody></table>");
      continue;
    }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        output.push(`<${nextType}>`);
        listType = nextType;
      }
      output.push(`<li>${formatInline((unordered || ordered)[1])}</li>`);
      continue;
    }
    closeList();
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 3);
      output.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
    } else if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push("<hr>");
    } else if (/^\s*>\s?/.test(line)) {
      output.push(`<blockquote>${formatInline(line.replace(/^\s*>\s?/, ""))}</blockquote>`);
    } else {
      output.push(`<p>${formatInline(line)}</p>`);
    }
  }
  closeList();
  return output.join("");
}

async function api(path, options = {}) {
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(path, {
    ...requestOptions,
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!response.ok) {
    let detail = `请求失败 (${response.status})`;
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch (_error) {
      // Keep the status-based fallback.
    }
    throw new Error(detail);
  }
  return response.json();
}

function toastTone(message, tone) {
  if (tone && tone !== "auto") return tone;
  const text = String(message || "");
  if (/(失败|错误|异常|不支持|不能|未允许)/.test(text)) return "error";
  if (/(请先|请选择|尚无|不存在|至少|最多|超过)/.test(text)) return "warning";
  if (/(完成|成功|已保存|已更新|已创建|已删除|已恢复|已进入|已切换|已复制|已发送|已加载|已采用|已冻结|已同步)/.test(text)) return "success";
  return "neutral";
}

function showToast(message, tone = "auto") {
  const resolvedTone = toastTone(message, tone);
  const glyph = resolvedTone === "success" ? "circle-check" : resolvedTone === "warning" ? "triangle-alert" : resolvedTone === "error" ? "circle-x" : "info";
  elements.toast.className = `toast is-${resolvedTone}`;
  elements.toast.innerHTML = `${icon(glyph)}<span>${escapeHtml(message)}</span>`;
  elements.toast.setAttribute("role", resolvedTone === "error" ? "alert" : "status");
  elements.toast.classList.add("is-visible");
  refreshIcons();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

function attachmentExtension(name) {
  return String(name || "").split(".").pop().toLowerCase();
}

function isSupportedAttachment(file) {
  return file.type.startsWith("image/")
    || file.type.startsWith("video/")
    || SUPPORTED_ATTACHMENT_EXTENSIONS.has(attachmentExtension(file.name));
}

function attachmentIcon(mimeType = "", name = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (["csv", "xlsx"].includes(attachmentExtension(name))) return "sheet";
  return "file-text";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderPendingAttachments() {
  elements.attachmentList.replaceChildren();
  elements.attachmentList.hidden = appState.pendingAttachments.length === 0;
  appState.pendingAttachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = "pending-attachment";
    item.innerHTML = `${icon(attachmentIcon(attachment.file.type, attachment.name))}
      <span class="pending-attachment-copy"><strong>${escapeHtml(attachment.name)}</strong><small>${formatFileSize(attachment.file.size)}</small></span>
      <button class="icon-button pending-attachment-remove" type="button" aria-label="移除 ${escapeHtml(attachment.name)}" title="移除附件">${icon("x")}</button>`;
    item.querySelector("button").addEventListener("click", () => {
      appState.pendingAttachments = appState.pendingAttachments.filter((entry) => entry.id !== attachment.id);
      renderPendingAttachments();
      syncComposerState();
    });
    elements.attachmentList.appendChild(item);
  });
  refreshIcons();
}

function addPendingAttachments(files) {
  const incoming = [...files];
  if (!incoming.length) return;
  for (const file of incoming) {
    if (!isSupportedAttachment(file)) {
      showToast(`不支持附件类型：${file.name || "剪贴板文件"}`);
      continue;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast(`单个附件不能超过 20 MB：${file.name}`);
      continue;
    }
    if (appState.pendingAttachments.length >= MAX_ATTACHMENT_COUNT) {
      showToast(`一次最多添加 ${MAX_ATTACHMENT_COUNT} 个附件`);
      break;
    }
    const totalBytes = appState.pendingAttachments.reduce((sum, entry) => sum + entry.file.size, 0);
    if (totalBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
      showToast("附件总大小不能超过 40 MB");
      break;
    }
    const extension = file.type.startsWith("image/") ? (file.type.split("/")[1] || "png") : "bin";
    const name = file.name || `粘贴的图片-${Date.now()}.${extension}`;
    const duplicate = appState.pendingAttachments.some((entry) => (
      entry.name === name && entry.file.size === file.size && entry.file.lastModified === file.lastModified
    ));
    if (!duplicate) appState.pendingAttachments.push({ id: `attachment-${crypto.randomUUID()}`, name, file });
  }
  renderPendingAttachments();
  syncComposerState();
}

function clearPendingAttachments() {
  appState.pendingAttachments = [];
  renderPendingAttachments();
  syncComposerState();
}

function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "").split(",", 2)[1] || ""));
    reader.addEventListener("error", () => reject(new Error(`无法读取附件：${file.name}`)));
    reader.readAsDataURL(file);
  });
}

function setView(view) {
  if (view === "overview") {
    openSpaceOverview(accountSpaces.find((space) => space.id === selectedOverviewSpaceId) || currentSpace());
    return;
  }
  if (view !== "chat") {
    disconnectStreamSubscription();
    setWorkflowDrawer(false);
    closeArtifact();
  }
  appState.view = view;
  syncDemoRerunVisibility();
  elements.app.classList.toggle("requirements-page", view === "requirements");
  elements.app.classList.toggle("knowledge-page", view === "knowledge");
  elements.app.classList.toggle("skills-page", view === "skills" || view === "agents");
  elements.app.classList.toggle("overview-page", view === "overview");
  const showTaskPanel = view === "chat";
  elements.app.classList.toggle("task-panel-hidden", !showTaskPanel);
  elements.taskPanelToggle.hidden = !showTaskPanel;
  elements.app.classList.remove("mobile-task-open");
  elements.taskPanel.setAttribute("aria-hidden", String(!showTaskPanel || appState.taskPanelCollapsed));
  elements.mobileTaskToggle.classList.toggle("is-hidden", !showTaskPanel);
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("is-active"));
  document.getElementById(`${view}-view`).classList.add("is-active");
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  elements.viewTitle.textContent = view === "chat" && appState.conversationId
    ? (document.querySelector(`.conversation-button[data-id="${appState.conversationId}"] span`)?.textContent || "对话")
    : viewLabels[view];
  elements.viewMeta.textContent = view === "chat" && appState.activeTaskLabel ? `· ${appState.activeTaskLabel}` : "";
  syncRequirementHeader();
  if (view === "skills") window.DWAgentSkills?.onViewEnter();
  if (view === "agents") renderAgents();
  if (view === "overview") loadSpaceOverview();
  refreshIcons();
}

function syncRequirementHeader() {
  const requirementId = appState.view === "chat" ? String(appState.requirementId || "").trim() : "";
  elements.viewRequirementId.hidden = !requirementId;
  elements.viewRequirementId.textContent = requirementId ? `需求 ID：${requirementId}` : "";
}

function syncDemoRerunVisibility() {
  const visible = appState.view === "chat"
    && appState.isDemoConversation
    && Boolean(appState.demoConversationInput);
  const readyToStart = visible
    && !appState.intent
    && !appState.requirementId
    && appState.messages.length === 1
    && appState.messages[0]?.role === "user";
  const actionsEnabled = appState.generationStatus !== "running";
  elements.demoStart.hidden = !(readyToStart && actionsEnabled);
  elements.demoRerun.hidden = !visible || readyToStart || !actionsEnabled;
  elements.app.classList.toggle("has-demo-rerun", visible);
}

function updateTaskContext() {
  const active = Boolean(appState.activeTaskId);
  elements.taskContext.classList.toggle("is-hidden", !active);
  elements.taskContextLabel.textContent = active ? `快速对话 · ${appState.activeTaskLabel}` : "";
  elements.emptyChatTitle.textContent = active ? appState.activeTaskLabel : "今天要处理什么？";
  if (appState.agentType === "codex_agent") {
    elements.chatInput.placeholder = "向 Dw Agent 提出问题";
    elements.viewMeta.textContent = "";
  } else if (active) {
    elements.chatInput.placeholder = taskPlaceholders[appState.activeTaskId] || "描述要处理的对话...";
    elements.viewMeta.textContent = `· ${appState.activeTaskLabel}`;
  } else if (appState.intent === "requirement") {
    const reviewInterrupted = ["paused", "stopped"].includes(appState.workflowStatus)
      && appState.workflowStage === "requirement_review";
    elements.viewMeta.textContent = "";
    elements.chatInput.placeholder = reviewInterrupted
      ? "补充需求评审所需材料..."
      : "提出你的需求，DW Agent帮你解决";
  } else {
    elements.chatInput.placeholder = "提出你的需求，DW Agent帮你解决";
    elements.viewMeta.textContent = "";
  }
  renderSupplementContext();
  renderTaskTypeButton();
  syncRequirementHeader();
}

function normalizeMissingMaterial(material, index = 0) {
  if (typeof material === "string") {
    return { id: `material-${index + 1}`, label: material.trim(), status: "pending" };
  }
  return {
    id: String(material?.id || `material-${index + 1}`),
    label: String(material?.label || "需要补充必要材料").trim(),
    status: String(material?.status || "pending"),
  };
}

function materialLabelKey(label) {
  return String(label || "").trim().replace(/[。.!！?？]+$/, "").toLocaleLowerCase();
}

function materialSelectionKey(stage, material) {
  return `${stage}:${material.id}`;
}

function activeMaterialGate(statuses = ["awaiting_materials", "checking"]) {
  const stages = appState.reviewGates?.stages || {};
  for (const stage of [...workflowStageBlueprint].reverse()) {
    const gate = stages[stage.id];
    if (gate && statuses.includes(gate.status)) return { stage: stage.id, gate };
  }
  return null;
}

function materialProgressFor(stage, gate = null) {
  if (!appState.materialProgress[stage]) {
    appState.materialProgress[stage] = { totalLabels: [], acceptedLabels: [] };
  }
  const progress = appState.materialProgress[stage];
  const totalKeys = new Set(progress.totalLabels.map(materialLabelKey));
  const acceptedKeys = new Set(progress.acceptedLabels.map(materialLabelKey));
  listFrom(gate?.missing_materials).map(normalizeMissingMaterial).forEach((material) => {
    const key = materialLabelKey(material.label);
    if (!totalKeys.has(key)) {
      totalKeys.add(key);
      progress.totalLabels.push(material.label);
    }
    if (material.status === "accepted" && !acceptedKeys.has(key)) {
      acceptedKeys.add(key);
      progress.acceptedLabels.push(material.label);
    }
  });
  return progress;
}

function materialGateItems(stage, gate) {
  const gateMaterials = listFrom(gate?.missing_materials).map(normalizeMissingMaterial);
  const progress = materialProgressFor(stage, gate);
  const acceptedKeys = new Set(progress.acceptedLabels.map(materialLabelKey));
  const byLabel = new Map(gateMaterials.map((material) => [materialLabelKey(material.label), material]));
  return progress.totalLabels.map((label, index) => {
    const key = materialLabelKey(label);
    const material = byLabel.get(key) || { id: `material-progress-${index + 1}`, label, status: "accepted" };
    return acceptedKeys.has(key) ? { ...material, status: "accepted" } : material;
  });
}

function materialGateCounts(stage, gate) {
  const materials = materialGateItems(stage, gate);
  const progress = materialProgressFor(stage, gate);
  const acceptedKeys = new Set(progress.acceptedLabels.map(materialLabelKey));
  const accepted = gate?.status === "awaiting_confirmation" || gate?.status === "passed"
    ? Math.max(progress.totalLabels.length, acceptedKeys.size)
    : acceptedKeys.size;
  const validating = 0;
  const open = gate?.status === "awaiting_confirmation" || gate?.status === "passed"
    ? 0
    : Math.max(0, materials.length - accepted - validating);
  const total = Math.max(progress.totalLabels.length, accepted + validating + open);
  return { accepted, validating, open, total, materials };
}

function resetMaterialInteractionState() {
  appState.selectedMaterialIds = new Set();
  appState.supplementContext = null;
  appState.materialProgress = {};
  appState.pendingMaterialSubmission = null;
  renderSupplementContext();
}

function clearSupplementContext() {
  const stage = appState.supplementContext?.stage || "";
  appState.supplementContext = null;
  appState.selectedMaterialIds = new Set();
  updateTaskContext();
  syncMaterialSelectionUi(stage);
  syncComposerState();
}

function syncMaterialSelectionUi(stage) {
  const article = [...elements.messageList.querySelectorAll(".review-material-message")]
    .find((item) => item.dataset.materialStage === stage);
  if (!article) return;
  let selectedCount = 0;
  article.querySelectorAll("button[data-material-key]").forEach((button) => {
    const selected = appState.selectedMaterialIds.has(button.dataset.materialKey);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.innerHTML = `${icon(selected ? "check" : "plus")}<span>${selected ? "已选择" : "选择"}</span>`;
    if (selected) selectedCount += 1;
  });
  const selection = article.querySelector(".review-material-selection");
  if (selection) {
    selection.textContent = selectedCount
      ? `已关联 ${selectedCount} 项，可在下方输入或上传材料`
      : "选择本次需要补充的内容";
  }
  refreshIcons();
}

function syncMaterialSupplementContext(stage, gate, materials) {
  const items = materials.filter((material) => appState.selectedMaterialIds.has(materialSelectionKey(stage, material)));
  appState.supplementContext = items.length
    ? {
        stage,
        stageLabel: gate.stage_label || workflowStageBlueprint.find((item) => item.id === stage)?.label || "当前阶段",
        items: items.map((item) => ({ ...item })),
      }
    : null;
  updateTaskContext();
  syncComposerState();
}

function renderSupplementContext() {
  const context = appState.supplementContext;
  const items = listFrom(context?.items);
  elements.supplementContext.hidden = !items.length;
  elements.supplementContextItems.replaceChildren();
  if (!items.length) return;
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "supplement-context-chip";
    chip.innerHTML = `<span>${escapeHtml(item.label)}</span><button type="button" aria-label="移除 ${escapeHtml(item.label)}" title="移除此项">${icon("x")}</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      context.items = context.items.filter((entry) => entry.id !== item.id);
      appState.selectedMaterialIds.delete(materialSelectionKey(context.stage, item));
      if (!context.items.length) appState.supplementContext = null;
      updateTaskContext();
      syncMaterialSelectionUi(context.stage);
      syncComposerState();
    });
    elements.supplementContextItems.appendChild(chip);
  });
  elements.chatInput.placeholder = "说明补充内容，或上传能够证明以上项目的材料…";
  refreshIcons();
}

function reconcileMaterialGate(gate) {
  const stage = String(gate?.stage || "");
  if (!stage) return;
  const progress = materialProgressFor(stage, gate);
  const pending = appState.pendingMaterialSubmission;
  if (!pending || pending.stage !== stage) return;
  if (gate.status === "checking") {
    pending.status = "validating";
    return;
  }
  if (!["awaiting_materials", "awaiting_confirmation", "passed"].includes(gate.status)) return;

  const remainingKeys = new Set(
    listFrom(gate.missing_materials).map(normalizeMissingMaterial).map((item) => materialLabelKey(item.label)),
  );
  const items = pending.items.map((item) => ({
    ...item,
    status: remainingKeys.has(materialLabelKey(item.label)) ? "remaining" : "accepted",
  }));
  const acceptedKeys = new Set(progress.acceptedLabels.map(materialLabelKey));
  items.filter((item) => item.status === "accepted").forEach((item) => {
    const key = materialLabelKey(item.label);
    if (!acceptedKeys.has(key)) {
      acceptedKeys.add(key);
      progress.acceptedLabels.push(item.label);
    }
  });
  appState.pendingMaterialSubmission = null;
}

function newWorkflowStages() {
  return workflowStageBlueprint.map((stage) => ({ ...stage, status: "waiting" }));
}

function eventTime(event, fallback = Date.now()) {
  const parsed = Date.parse(event?.recorded_at || "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildReviewSteps(events = [], fallback = {}) {
  const steps = workflowStageBlueprint.map((item) => ({
    ...item,
    status: "waiting",
    startedAt: 0,
    endedAt: 0,
    message: "",
    tools: [],
  }));
  const byId = Object.fromEntries(steps.map((step) => [step.id, step]));
  const filtered = (events || []).filter((event) => byId[event?.stage || event?.current_stage]);

  function start(step, time, message = "") {
    if (!step.startedAt) step.startedAt = time;
    if (step.status === "waiting") step.status = "running";
    if (message) step.message = message;
  }

  function complete(step, time, message = "") {
    start(step, time, message);
    step.status = "completed";
    step.endedAt = time;
    step.tools.forEach((tool) => {
      if (tool.status !== "completed") {
        tool.status = "completed";
        tool.endedAt = time;
      }
    });
  }

  function upsertTool(step, rawStep, status, message, time, detail = null, metadata = {}) {
    if (!rawStep) return;
    const name = workflowToolNames[rawStep] || rawStep.replaceAll("_", " ");
    let tool = step.tools.find((item) => item.id === rawStep);
    if (!tool) {
      tool = {
        id: rawStep,
        name,
        status: "running",
        message: "",
        callMessage: "",
        resultMessage: "",
        detail: null,
        invocationCount: 0,
        explicitToolName: "",
        durationMs: null,
        startedAt: time,
        endedAt: 0,
      };
      step.tools.push(tool);
    }
    tool.status = status === "completed" ? "completed" : "running";
    if (!tool.startedAt) tool.startedAt = time;
    if (tool.status === "completed") {
      tool.endedAt = time;
      if (message) tool.resultMessage = message;
      if (detail?.groups?.length) tool.detail = detail;
    } else if (message && (!tool.callMessage || status === "started")) {
      tool.callMessage = message;
    }
    if (message) tool.message = message;
    const invocationCount = Number(metadata.tool_call_count ?? metadata.invocation_count ?? 0);
    if (Number.isFinite(invocationCount) && invocationCount > 0) tool.invocationCount = invocationCount;
    const explicitToolName = String(metadata.tool_name || "").trim();
    if (explicitToolName) tool.explicitToolName = explicitToolName;
    const activityDurationMs = Number(metadata.activity_duration_ms);
    if (Object.hasOwn(metadata, "activity_duration_ms") && Number.isFinite(activityDurationMs)) {
      tool.durationMs = Math.max(0, activityDurationMs);
    }
  }

  filtered.forEach((event, index) => {
    const time = eventTime(event, Date.now() + index);
    const stageId = String(event.stage || event.current_stage || "");
    const step = byId[stageId];
    if (!step) return;
    const rawStep = String(event.activity_step || "");
    const activityStatus = String(event.activity_status || event.status || "running");
    const message = String(event.message || "");
    listFrom(event.completed_stages).forEach((completedId) => {
      if (byId[completedId]) complete(byId[completedId], time, byId[completedId].message);
    });

    if (event.status === "completed") complete(step, time, message || `${step.label}已完成`);
    else start(step, time, message);
    upsertTool(step, rawStep, activityStatus, message, time, event.detail, event);
    if (event.type === "result" && ["paused", "stopped"].includes(event.status)) {
      step.status = event.status;
      step.endedAt = time;
    }
  });

  const currentIndex = workflowStageBlueprint.findIndex((stage) => stage.id === fallback.stage);
  if (currentIndex >= 0) {
    const fallbackTime = Date.parse(fallback.updatedAt || "") || Date.now();
    steps.forEach((step, index) => {
      if (index < currentIndex && step.status === "waiting") complete(step, fallbackTime, "已完成");
    });
    const current = byId[fallback.stage];
    if (current.status === "waiting" && fallback.status) start(current, fallbackTime);
    if (["paused", "stopped"].includes(fallback.status)) {
      current.status = fallback.status;
      current.endedAt = fallbackTime;
    }
  }
  if (fallback.status === "completed") {
    const completedAt = Date.parse(fallback.updatedAt || "") || Date.now();
    steps.forEach((step) => {
      if (step.status !== "completed") complete(step, completedAt, step.message || "已完成");
    });
  }
  return steps;
}

function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateElapsedTimers() {
  document.querySelectorAll(".review-elapsed").forEach((node) => {
    const startedAt = Number(node.dataset.startedAt || 0);
    const endedAt = Number(node.dataset.endedAt || 0);
    node.textContent = startedAt ? formatElapsed((endedAt || Date.now()) - startedAt) : "--:--";
  });
}

function reviewGateDisplay(gate, fallbackStatus) {
  const status = gate?.status || "";
  if (status === "passed") return { status: "completed", label: "已完成", icon: "check" };
  if (status === "invalidated") return { status: "waiting", label: "待重新执行", icon: "circle" };
  if (status === "awaiting_materials") return { status: "material", label: "待补材料", icon: "file-warning" };
  if (status === "checking") return { status: "material", label: "待补材料", icon: "file-warning" };
  if (status === "revision_requested") return { status: "blocked", label: "正在修改", icon: "file-pen-line" };
  if (status === "blocked_unable") return { status: "blocked", label: "等待转派", icon: "circle-slash-2" };
  if (status === "awaiting_confirmation") return { status: "running", label: "待确认", icon: "shield-alert" };
  return { status: fallbackStatus, label: workflowStatusLabels[fallbackStatus] || "未开始", icon: workflowProgressIcon(fallbackStatus, true) };
}

function reviewGateSummary(gate, stage = "") {
  if (!gate) return "";
  if (gate.status === "passed") return `<div class="review-gate-summary is-ready">${icon("circle-check-big")}<span>当前版本评审已通过</span></div>`;
  if (gate.status === "invalidated") return `<div class="review-gate-summary is-warning">${icon("history")}<span>上游输入已变化，当前版本失效</span></div>`;
  if (["awaiting_materials", "checking"].includes(gate.status)) {
    const counts = materialGateCounts(stage || gate.stage, gate);
    const nextOpen = counts.materials.find((material) => material.status !== "accepted");
    const title = `${counts.open} 项内容待补充`;
    const blocker = `当前阻塞：${nextOpen?.label || counts.materials[0]?.label || "等待补充必要材料"}`;
    const gotoButton = counts.open
      ? `<button class="command-button review-material-goto" type="button" data-workflow-goto-material="${escapeHtml(stage || gate.stage)}">${icon("corner-left-down")}<span>前往补充</span></button>`
      : "";
    return `<div class="review-material-summary" data-review-material-summary="${escapeHtml(stage || gate.stage)}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(blocker)}</span>
      <div class="review-material-counts"><small>${counts.accepted} 已补充</small><small>${counts.open} 待补充</small></div>
      ${gotoButton}
    </div>`;
  }
  if (gate.status === "revision_requested") return `<div class="review-gate-summary is-warning">${icon("file-pen-line")}<span>已根据对话意见重新生成当前阶段产物</span></div>`;
  if (gate.status === "blocked_unable") return `<div class="review-gate-summary is-blocked">${icon("circle-slash-2")}<span>数仓工程师无法承接，等待重新分配</span></div>`;
  return "";
}

function renderReviewStepsHtml(steps, stageReports = {}, reviewGates = {}) {
  return steps.map((step, index) => {
    const gate = reviewGates[step.id] || null;
    const gateDisplay = reviewGateDisplay(gate, step.status);
    const displayStatus = gateDisplay.status;
    const statusIcon = gateDisplay.icon;
    const statusLabel = gateDisplay.label;
    const report = stageReports[step.id] || null;
    const reportTitle = ({
      requirement_review: "需求评审报告",
      warehouse_research: "数仓调研报告",
      model_design: "模型设计报告",
      data_development: "数仓开发结果",
      data_validation: "数据验证结果",
      solution_review: "方案审查报告",
    })[step.id] || "";
    const reviewers = listFrom(gate?.reviewers);
    const currentReviewer = reviewers.find((reviewer) => reviewer.username === appState.selectedAccount);
    const displayedReviewers = [];
    const canConfirm = Boolean(
      gate?.status === "awaiting_confirmation"
      && appState.selectedAccount
    );
    const canRerun = Boolean(
      report
      && ["passed", "awaiting_confirmation"].includes(gate?.status)
    );
    const confirmLabel = currentReviewer?.status === "confirmed" ? "继续执行" : "确认无误";
    const reviewerRows = displayedReviewers.length
      ? `<div class="review-confirmations">${displayedReviewers.map((reviewer) => {
          const confirmed = reviewer.status === "confirmed";
          return `<div class="review-confirmation-row"><span>${escapeHtml(reviewer.username || "-")}</span><span class="review-confirmation-state ${confirmed ? "is-confirmed" : ""}">${icon(confirmed ? "circle-check" : "clock-3")}${confirmed ? "已确认" : "待确认"}</span></div>`;
        }).join("")}</div>`
      : "";
    const materialGate = ["awaiting_materials", "checking"].includes(gate?.status);
    const reviewArtifact = materialGate
      ? `<section class="review-step-material-block" aria-label="${escapeHtml(step.label)}缺失材料摘要">${reviewGateSummary(gate, step.id)}</section>`
      : reportTitle && (report || gate)
      ? `<section class="review-step-artifact is-flat" aria-label="${reportTitle}">
          <div class="review-step-artifact-head">
            <span class="review-step-artifact-copy"><strong>${reportTitle}</strong></span>
            ${gate?.version ? `<span class="review-artifact-version">${escapeHtml(gate.version)}</span>` : ""}
          </div>
          ${reviewGateSummary(gate, step.id)}
          ${reviewerRows}
          <div class="review-step-artifact-actions">
            <button class="command-button review-report-open" type="button" data-stage-report-open="${step.id}" aria-label="查看${reportTitle}" ${report ? "" : "disabled"}>${icon("eye")}<span>查看报告</span></button>
            ${canRerun ? `<button class="command-button review-stage-rerun" type="button" data-stage-rerun="${step.id}" ${appState.generationStatus === "running" ? "disabled" : ""}>${icon("rotate-ccw")}<span>重跑</span></button>` : ""}
            ${canConfirm ? `<button class="command-button primary review-report-confirm" type="button" data-stage-report-confirm="${step.id}" ${appState.generationStatus === "running" ? "disabled" : ""}>${icon("check")}<span>${confirmLabel}</span></button>` : ""}
          </div>
        </section>`
      : "";
    return `<li class="review-step is-${escapeHtml(displayStatus)}" data-workflow-stage="${escapeHtml(step.id)}">
      <button class="review-step-dot" type="button" data-workflow-stage-anchor="${escapeHtml(step.id)}" aria-label="定位到${escapeHtml(step.label)}阶段内容" title="定位到${escapeHtml(step.label)}阶段内容">${icon(statusIcon)}</button>
      <div class="review-step-copy">
        <div class="review-step-head"><button class="review-step-title" type="button" data-workflow-stage-anchor="${escapeHtml(step.id)}" title="定位到${escapeHtml(step.label)}阶段内容"><strong>${escapeHtml(step.label)}</strong></button><span class="review-step-state">${statusLabel}</span></div>
        <div class="review-step-meta"><span>耗时 <b class="review-elapsed" data-started-at="${step.startedAt}" data-ended-at="${step.endedAt}">--:--</b></span></div>
        ${reviewArtifact}
      </div>
    </li>`;
  }).join("");
}

function visibleMessageContent(message) {
  const parsed = parseSupplementContent(message.content || "");
  if (message.role === "user" && !listFrom(message.supplementItems).length && parsed.items.length) {
    message.supplementItems = parsed.items;
  }
  return parsed.content;
}

function isInlineMaterialValidationMessage(message) {
  if (message?.stage_result || listFrom(message?.artifacts).length) return false;
  return Boolean(
    message?.inlineMaterialValidation
    || message?.inline_material_validation
    || /^##\s*本次补充已校验/.test(String(message?.content || "").trim())
  );
}

function parseSupplementContent(content) {
  const value = String(content || "");
  const match = value.match(/^【本次补充关联】([^\n]+)(?:\n\n|\n|$)/);
  if (!match) return { content: value, items: [] };
  return {
    content: value.slice(match[0].length) || "已上传补充材料。",
    items: match[1].split("｜").map((label, index) => ({ id: `history-material-${index + 1}`, label: label.trim() })).filter((item) => item.label),
  };
}

function supplementRequestContent(content, items) {
  const labels = items.map((item) => String(item.label || "").trim()).filter(Boolean);
  if (!labels.length) return String(content || "").trim();
  const body = String(content || "").trim() || "已上传补充材料。";
  return `【本次补充关联】${labels.join("｜")}\n\n${body}`;
}

function isRequirementReviewConfirmationGate() {
  return appState.intent === "requirement"
    && appState.workflowStatus === "paused"
    && appState.workflowResumeStage === "warehouse_research"
    && isRequirementReviewConfirmationReason(appState.workflowPauseReason);
}

function isWarehouseResearchConfirmationGate() {
  return appState.intent === "requirement"
    && appState.workflowStatus === "paused"
    && appState.workflowResumeStage === "model_design"
    && isWarehouseResearchConfirmationReason(appState.workflowPauseReason);
}

function isModelDesignConfirmationGate() {
  return appState.intent === "requirement"
    && appState.workflowStatus === "paused"
    && appState.workflowResumeStage === "data_development"
    && isModelDesignConfirmationReason(appState.workflowPauseReason);
}

function isDataDevelopmentConfirmationGate() {
  return appState.intent === "requirement"
    && appState.workflowStatus === "paused"
    && appState.workflowResumeStage === "data_validation"
    && isDataDevelopmentConfirmationReason(appState.workflowPauseReason);
}

function isDataValidationConfirmationGate() {
  return appState.intent === "requirement"
    && appState.workflowStatus === "paused"
    && appState.workflowResumeStage === "solution_review"
    && isDataValidationConfirmationReason(appState.workflowPauseReason);
}

function isSolutionReviewConfirmationGate() {
  return appState.intent === "requirement"
    && appState.workflowStatus === "paused"
    && appState.workflowStage === "solution_review"
    && isSolutionReviewConfirmationReason(appState.workflowPauseReason);
}

function reportConfirmationStage() {
  if (isRequirementReviewConfirmationGate()) return "requirement_review";
  if (isWarehouseResearchConfirmationGate()) return "warehouse_research";
  if (isModelDesignConfirmationGate()) return "model_design";
  if (isDataDevelopmentConfirmationGate()) return "data_development";
  if (isDataValidationConfirmationGate()) return "data_validation";
  if (isSolutionReviewConfirmationGate()) return "solution_review";
  return "";
}

function appendActivity(message, text) {
  const value = String(text || "").trim();
  if (!value) return;
  if (!message.activities) message.activities = [];
  if (message.activities[message.activities.length - 1] !== value) message.activities.push(value);
  if (message.activities.length > 30) message.activities = message.activities.slice(-30);
}

function upsertCodexExecution(message, payload) {
  if (!Array.isArray(message.executionEvents)) message.executionEvents = [];
  const id = String(payload?.id || "");
  const index = message.executionEvents.findIndex((item) => String(item?.id || "") === id);
  if (index >= 0) message.executionEvents[index] = { ...message.executionEvents[index], ...payload };
  else message.executionEvents.push({ ...payload });

  if (!Array.isArray(message.codexProgressItems)) message.codexProgressItems = [];
  const progressIndex = message.codexProgressItems.findIndex((item) => (
    item?.type === "execution" && String(item?.id || "") === id
  ));
  const progressItem = { ...payload, id, type: "execution" };
  if (progressIndex >= 0) message.codexProgressItems[progressIndex] = {
    ...message.codexProgressItems[progressIndex],
    ...progressItem,
  };
  else message.codexProgressItems.push(progressItem);
}

function appendCodexProgressText(message, text) {
  const value = String(text || "");
  if (!value) return;
  if (!Array.isArray(message.codexProgressItems)) message.codexProgressItems = [];
  if (!Number.isFinite(message.codexProgressSequence)) message.codexProgressSequence = 0;

  value.split(/(\n{2,})/).forEach((part) => {
    if (!part) return;
    if (/^\n{2,}$/.test(part)) {
      message.codexProgressBreakPending = true;
      return;
    }
    const last = message.codexProgressItems[message.codexProgressItems.length - 1];
    if (!last || last.type !== "note" || message.codexProgressBreakPending) {
      message.codexProgressSequence += 1;
      message.codexProgressItems.push({
        id: `note-${message.codexProgressSequence}`,
        type: "note",
        text: part.replace(/^\n+/, ""),
      });
    } else {
      last.text = `${last.text || ""}${part}`;
    }
    message.codexProgressBreakPending = false;
  });
}

function codexExecutionSummary(item) {
  const detail = String(item?.detail || "").replace(/\s+/g, " ").trim();
  if (item?.kind === "file") return detail ? `修改文件：${detail}` : "修改文件";
  if (item?.kind === "search") return detail ? `检索资料：${detail}` : "检索资料";
  if (item?.kind === "tool") return detail ? `调用工具：${detail}` : "调用工具";
  if (/read_feishu\.py/.test(detail)) return "读取飞书需求文档";
  if (/\/SKILL\.md\b|references\/output-template\.md/.test(detail)) return "读取 Skill 规则";
  if (/dp-hub\s+docs\s+--doc/.test(detail)) return "读取数据查询规则";
  if (/dp-hub\s+docs\s+--grep/.test(detail)) return "检索数据知识库";
  if (/dp-hub\s+dc\s+metrics-series/.test(detail)) return "读取指标详情";
  if (/dp-hub\s+dc\s+metrics/.test(detail)) return "检索指标";
  if (/dp-hub\s+meta\s+lineage/.test(detail)) return "查询表血缘";
  if (/dp-hub\s+meta\s+(?:table-info|job-info)/.test(detail)) return "查询生产元数据";
  if (/dp-hub\s+dc\s+(?:query|probe-table)/.test(detail)) return "查询线上数据";
  if (/(?:^|\s)(?:rg|find)\s/.test(detail)) return "检索工程文件";
  if (/(?:^|\s)(?:jq|sed|cat)\s/.test(detail)) return "读取工程内容";
  if (/uv\s+run\s+scripts\/init\.py/.test(detail)) return "初始化数据查询工具";
  if (/dp-hub\s+--version|command -v dp-hub/.test(detail)) return "检查数据查询工具";
  return String(item?.title || "执行操作");
}

function renderCodexProgressItem(item, index, items, thinking) {
  const isLast = index === items.length - 1;
  const status = item.type === "execution"
    ? (item.status || "running")
    : (thinking && isLast ? "running" : "completed");
  const normalizedStatus = status === "failed" ? "failed" : (status === "completed" ? "completed" : "running");
  const iconName = normalizedStatus === "failed" ? "circle-x" : (normalizedStatus === "completed" ? "check" : "loader-circle");
  const copy = item.type === "note"
    ? escapeHtml(String(item.text || "").trim()).replace(/\n/g, "<br>")
    : escapeHtml(codexExecutionSummary(item));
  const duration = item.type === "execution" && item.status !== "running" && Number(item.duration_ms) > 0
    ? `<small>${escapeHtml(formatElapsed(Number(item.duration_ms)))}</small>`
    : "";
  const rawDetail = item.type === "execution" ? String(item.detail || "").trim() : "";
  const detail = rawDetail ? `<details class="codex-progress-detail" data-disclosure-key="codex-progress:${escapeHtml(item.id || String(index))}">
    <summary>查看命令</summary><code>${escapeHtml(rawDetail)}</code>
  </details>` : "";
  return `<li class="codex-progress-item is-${normalizedStatus}">
    <span class="codex-progress-icon" aria-label="${executionStatusLabel(normalizedStatus)}">${icon(iconName)}</span>
    <div class="codex-progress-copy"><div>${copy}${duration}</div>${detail}</div>
  </li>`;
}

function renderCodexProgress(message, disclosureScope = "") {
  const items = listFrom(message.codexProgressItems).filter((item) => (
    item?.type === "execution" || String(item?.text || "").trim()
  ));
  if (!items.length) return "";
  const recentLimit = 12;
  const previous = items.slice(0, Math.max(0, items.length - recentLimit));
  const recent = items.slice(previous.length);
  const renderItems = (entries, offset = 0) => `<ol class="codex-progress-list">${entries.map((item, index) => (
    renderCodexProgressItem(item, index + offset, items, Boolean(message.thinking))
  )).join("")}</ol>`;
  const history = previous.length ? `<details class="codex-progress-history" data-disclosure-key="${escapeHtml(`${disclosureScope}:codex-progress-history`)}">
    <summary>查看之前 ${previous.length} 个步骤</summary>
    ${renderItems(previous)}
  </details>` : "";
  return `<div class="codex-progress" aria-live="polite">${history}${renderItems(recent, previous.length)}</div>`;
}

function codexTranscriptItems(message) {
  const persisted = listFrom(message.codexProgressItems || message.codex_progress_items);
  if (persisted.length) {
    return persisted.reduce((items, item) => {
      if (item?.type !== "note") {
        items.push(item);
        return items;
      }
      const last = items[items.length - 1];
      if (last?.type === "note") last.text = `${last.text || ""}${item.text || ""}`;
      else items.push({ ...item });
      return items;
    }, []);
  }
  return listFrom(message.executionEvents || message.execution_events).map((item) => ({
    ...item,
    type: "execution",
  }));
}

function codexTranscriptValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return String(value);
  }
}

function codexTranscriptKind(item) {
  if (item?.kind === "tool") return "工具调用";
  if (item?.kind === "command") return "命令执行";
  if (item?.kind === "file") return "文件修改";
  if (item?.kind === "search") return "资料检索";
  return String(item?.title || item?.item_type || "执行");
}

function renderCodexTranscriptItem(item, index, disclosureScope, thinking) {
  if (item?.type === "note") {
    const text = String(item.text || "").trim();
    if (!text) return "";
    return `<li class="codex-transcript-note">
      <div class="codex-transcript-note-copy">${escapeHtml(text).replace(/\n/g, "<br>")}</div>
    </li>`;
  }
  const status = item?.status === "failed"
    ? "failed"
    : (item?.status === "completed"
      ? "completed"
      : (item?.status === "stopped" ? "stopped" : (thinking ? "running" : "completed")));
  const label = codexTranscriptKind(item);
  const detail = String(item?.detail || item?.tool || item?.command || item?.query || "").trim();
  const title = detail ? `${label} · ${detail}` : label;
  const input = codexTranscriptValue(item?.input);
  const output = codexTranscriptValue(item?.output);
  const error = codexTranscriptValue(item?.error);
  const changes = codexTranscriptValue(item?.changes);
  const cwd = String(item?.cwd || "").trim();
  const duration = Number(item?.duration_ms) > 0 ? formatElapsed(Number(item.duration_ms)) : "";
  const payloadBlocks = [
    input ? `<div class="codex-transcript-payload"><span>输入</span><pre>${escapeHtml(input)}</pre></div>` : "",
    output ? `<div class="codex-transcript-payload"><span>输出</span><pre>${escapeHtml(output)}</pre></div>` : "",
    error ? `<div class="codex-transcript-payload is-error"><span>错误</span><pre>${escapeHtml(error)}</pre></div>` : "",
    changes && changes !== "[]" ? `<div class="codex-transcript-payload"><span>变更</span><pre>${escapeHtml(changes)}</pre></div>` : "",
    cwd ? `<div class="codex-transcript-meta">工作目录：${escapeHtml(cwd)}</div>` : "",
    item?.exit_code != null ? `<div class="codex-transcript-meta">退出码：${escapeHtml(String(item.exit_code))}</div>` : "",
  ].filter(Boolean).join("");
  const payload = payloadBlocks
    ? `<details class="codex-transcript-payloads" data-disclosure-key="${escapeHtml(`${disclosureScope}:transcript:${item.id || index}`)}">
        <summary>调用结果${duration ? ` · ${escapeHtml(duration)}` : ""}</summary>
        <div>${payloadBlocks}</div>
      </details>`
    : (duration ? `<span class="codex-transcript-duration">${escapeHtml(duration)}</span>` : "");
  return `<li class="codex-transcript-item is-${status}">
    <div class="codex-transcript-main">
      <div class="codex-transcript-title"><span>${escapeHtml(title)}</span><span class="codex-transcript-status">${escapeHtml(executionStatusLabel(status))}</span></div>
      ${payload}
    </div>
  </li>`;
}

function renderCodexTranscript(message, disclosureScope = "") {
  const items = codexTranscriptItems(message).filter((item) => (
    item?.type === "note" ? String(item.text || "").trim() : item && (item.id || item.detail || item.kind || item.title)
  ));
  if (!items.length) return "";
  const thinking = Boolean(message.streaming && message.thinking !== false);
  return `<section class="codex-transcript" aria-label="Dw Agent 执行记录">
    <ol class="codex-transcript-list">${items.map((item, index) => renderCodexTranscriptItem(item, index, disclosureScope, thinking)).join("")}</ol>
  </section>`;
}

function executionStatusLabel(status) {
  return workflowStatusLabels[status] || (status === "completed" ? "已完成" : "进行中");
}

function renderActivityNotes(activities, activeLast = false) {
  if (!activities.length) return "";
  return `<ol class="execution-process-list execution-summary-list">${activities.map((item, index) => {
    const active = Boolean(activeLast && index === activities.length - 1);
    const description = renderActivityDescription(item);
    return `<li class="execution-process execution-summary is-${active ? "running" : "completed"}">
      <div class="execution-process-title">
        <span class="execution-process-copy">${description}<span class="execution-process-icon">${icon(active ? "loader-circle" : "check")}</span></span>
      </div>
    </li>`;
  }).join("")}</ol>`;
}

function executionLineText(value) {
  return String(value || "").trim().replace(/(?:\.{3,}|…+)$/, "").trimEnd();
}

function plainDocumentSummary(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/(^|\s)#{1,6}\s*/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderExecutionDetailGroups(groups) {
  return groups.map((group) => `
    <section class="execution-detail-group">
      <h5>${escapeHtml(group.title || "明细")}</h5>
      <dl>${listFrom(group.items).map((item) => {
        const status = ["passed", "failed"].includes(item?.status) ? item.status : "";
        const statusLabel = status === "passed" ? "通过" : (status === "failed" ? "未通过" : "");
        const displayValue = group.title === "文档摘要" && item?.label === "摘要"
          ? plainDocumentSummary(item?.value)
          : item?.value;
        return `<div class="execution-detail-row${status ? ` is-${status}` : ""}">
          <dt><span>${escapeHtml(item?.label || "明细")}</span>${status ? `<span class="execution-detail-status">${icon(status === "passed" ? "check" : "x")}${statusLabel}</span>` : ""}</dt>
          <dd>${escapeHtml(displayValue || "-")}</dd>
        </div>`;
      }).join("")}</dl>
    </section>`).join("");
}

function renderExecutionResultDetail(detail, detailKey = "") {
  const groups = listFrom(detail?.groups).filter((group) => listFrom(group?.items).length);
  const hasRawJson = detail?.detail_type === "requirement_parse" && detail?.raw_json != null;
  if (!groups.length && !hasRawJson) return "";
  const viewKey = `${detailKey}:result`;
  const mode = hasRawJson ? (appState.executionResultViewState.get(viewKey) || "structured") : "structured";
  const rawJson = hasRawJson
    ? (typeof detail.raw_json === "string" ? detail.raw_json : JSON.stringify(detail.raw_json, null, 2))
    : "";
  const tabs = hasRawJson ? `<div class="execution-detail-tabs" role="tablist" aria-label="需求解析结果视图">
    <button type="button" role="tab" class="${mode === "structured" ? "is-active" : ""}" data-execution-detail-mode="structured" aria-selected="${mode === "structured"}">结构化字段</button>
    <button type="button" role="tab" class="${mode === "json" ? "is-active" : ""}" data-execution-detail-mode="json" aria-selected="${mode === "json"}">原始 JSON</button>
  </div>` : "";
  return `<div class="execution-result-detail${hasRawJson ? " has-raw-json" : ""}" data-execution-detail-key="${escapeHtml(viewKey)}">
    ${tabs}
    <div class="execution-detail-panel" data-execution-detail-panel="structured"${mode === "structured" ? "" : " hidden"}>${renderExecutionDetailGroups(groups)}</div>
    ${hasRawJson ? `<pre class="execution-detail-json" data-execution-detail-panel="json"${mode === "json" ? "" : " hidden"}><code>${escapeHtml(rawJson)}</code></pre>` : ""}
  </div>`;
}

function setExecutionResultView(button) {
  const host = button.closest(".execution-result-detail.has-raw-json");
  if (!host) return;
  const mode = button.dataset.executionDetailMode;
  if (!["structured", "json"].includes(mode)) return;
  appState.executionResultViewState.set(host.dataset.executionDetailKey, mode);
  host.querySelectorAll("button[data-execution-detail-mode]").forEach((item) => {
    const active = item.dataset.executionDetailMode === mode;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
  });
  host.querySelectorAll("[data-execution-detail-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.executionDetailPanel !== mode;
  });
}

function renderActivityDescription(item) {
  const value = executionLineText(item);
  const requirementMatch = value.match(/^已识别为\s*(完整需求|数仓研发需求)(?:[，,]\s*(.*))?$/);
  if (requirementMatch) {
    const nextStep = requirementMatch[2] || "";
    return `<span>已识别为</span><span class="intent-label-highlight is-requirement">${escapeHtml(requirementMatch[1])}</span>${nextStep ? `<span>，${escapeHtml(nextStep)}</span>` : ""}`;
  }
  const conversationMatch = value.match(/^已识别为普通问答(?:[，,]\s*(.*))?$/);
  if (conversationMatch) {
    const nextStep = conversationMatch[1] || "";
    return `<span>已识别为</span><span class="intent-label-highlight is-conversation">普通问答</span>${nextStep ? `<span>，${escapeHtml(nextStep)}</span>` : ""}`;
  }
  const quickTaskMatch = value.match(/^已选择(.+?) Agent(?:[，,]\s*(.*))?$/);
  if (quickTaskMatch) {
    const nextStep = quickTaskMatch[2] || "";
    return `<span>已选择</span><span class="intent-label-highlight is-quick-task">${escapeHtml(quickTaskMatch[1])}</span><span> Agent</span>${nextStep ? `<span>，${escapeHtml(nextStep)}</span>` : ""}`;
  }
  return escapeHtml(value);
}

function normalizeMessageActivities(message) {
  let activities = listFrom(message.activities);
  const intent = message.route?.intent || "";
  if (intent) {
    activities = activities.filter((item) => ![
      "正在识别用户意图和对话范围...",
      "正在读取当前上下文和已有对话状态...",
      "开始解析输入内容，识别任务目标、信息范围和处理类型。",
    ].includes(String(item || "").trim()));
  }
  return activities;
}

function renderExecutionDetails(events, activities, thinking, reasoningSummary, disclosureScope = "") {
  const steps = buildReviewSteps(events);
  const visibleSteps = steps.filter((step) => step.startedAt || step.tools.length);
  const eventMessages = new Set(events.map((event) => String(event.message || "").trim()).filter(Boolean));
  const activityEntries = (activities || []).map((item, index) => ({
    index,
    value: String(item || "").trim(),
  })).filter((item) => item.value);
  const eventActivityIndexes = activityEntries
    .filter((item) => eventMessages.has(item.value))
    .map((item) => item.index);
  const firstEventIndex = eventActivityIndexes.length ? Math.min(...eventActivityIndexes) : Number.POSITIVE_INFINITY;
  const notes = activityEntries.filter((item) => !eventMessages.has(item.value));
  const leadingNotes = notes.filter((item) => item.index < firstEventIndex).map((item) => item.value);
  const trailingNotes = notes.filter((item) => item.index >= firstEventIndex).map((item) => item.value);
  const stageHtml = visibleSteps.map((step) => {
    const processes = step.tools.map((tool) => {
      const resultMessage = tool.resultMessage || (tool.status === "completed" ? tool.message : "");
      const processMessage = executionLineText(
        tool.callMessage || tool.resultMessage || tool.message,
      );
      if (!processMessage) return "";
      const disclosureKey = `${disclosureScope}:${step.id}:${tool.id}:${tool.startedAt || 0}`;
      return `<li class="execution-process is-${escapeHtml(tool.status)}">
        <div class="execution-process-title">
          <span class="execution-process-copy">${escapeHtml(processMessage)}<span class="execution-process-icon">${icon(tool.status === "completed" ? "check" : "loader-circle")}</span></span>
        </div>
        <details class="execution-invocation" data-disclosure-key="${escapeHtml(`${disclosureKey}:invocation`)}">
          <summary>
            ${tool.invocationCount ? `<span>工具调用 ${tool.invocationCount} 次</span>` : ""}
            ${Number.isFinite(tool.durationMs) ? `<span class="execution-invocation-duration">耗时 ${formatElapsed(tool.durationMs)}</span>` : ""}
          </summary>
          <details class="execution-invocation-detail" data-disclosure-key="${escapeHtml(`${disclosureKey}:detail`)}" open>
            <summary>${escapeHtml(tool.explicitToolName || "执行详情")}</summary>
            ${resultMessage ? `<div class="execution-invocation-content">
              <span class="execution-invocation-label">执行结果</span>
              <p>${escapeHtml(resultMessage)}</p>
              ${renderExecutionResultDetail(tool.detail, disclosureKey)}
            </div>` : ""}
          </details>
        </details>
      </li>`;
    }).join("");
    return processes ? `<ol class="execution-process-list">${processes}</ol>` : "";
  }).join("");
  const activeSummary = Boolean(thinking && !visibleSteps.length && !reasoningSummary);
  return `${renderActivityNotes(leadingNotes, activeSummary && !trailingNotes.length)}${stageHtml}${renderActivityNotes(trailingNotes, activeSummary)}${reasoningSummary ? `<div class="reasoning-summary">${escapeHtml(reasoningSummary).replace(/\n/g, "<br>")}</div>` : ""}`;
}

function markMessageStopped(message) {
  if (!message) return;
  message.streaming = false;
  message.thinking = false;
  (message.workflowStages || []).forEach((stage) => {
    if (!["waiting", "completed", "paused", "stopped"].includes(stage.status)) {
      stage.status = "stopped";
    }
  });
  message.workflowMessage = "已停止当前处理，现有进度已保留";
  appendActivity(message, "已停止当前处理，已保留现有进度。");
  message.content = message.content || "已停止生成。";
  appState.workflowStatus = appState.intent === "requirement" ? "stopped" : appState.workflowStatus;
  updateTaskContext();
}

function captureExecutionDisclosureState() {
  elements.messageList.querySelectorAll("details[data-disclosure-key]").forEach((details) => {
    appState.executionDisclosureState.set(details.dataset.disclosureKey, details.open);
  });
}

function restoreExecutionDisclosureState() {
  elements.messageList.querySelectorAll("details[data-disclosure-key]").forEach((details) => {
    const state = appState.executionDisclosureState.get(details.dataset.disclosureKey);
    if (typeof state === "boolean") details.open = state;
  });
}

function disconnectStreamSubscription() {
  const controller = appState.abortController;
  appState.abortController = null;
  appState.streamConversationId = "";
  if (controller) controller.abort();
  setStreaming(false);
}

function workflowEventsForMessage(message, conversation, runningPlaceholder = false) {
  const events = listFrom(conversation.workflow_events);
  const messages = listFrom(conversation.messages);
  const messageIndex = runningPlaceholder ? messages.length : messages.indexOf(message);
  const previousUser = messages
    .slice(0, Math.max(0, messageIndex))
    .reverse()
    .find((item) => item.role === "user");
  const startedAt = Date.parse(previousUser?.created_at || "");
  const endedAt = runningPlaceholder ? Number.POSITIVE_INFINITY : Date.parse(message.created_at || "");
  if (!Number.isFinite(startedAt)) return events;
  return events.filter((event) => {
    const recordedAt = Date.parse(event.recorded_at || "");
    return Number.isFinite(recordedAt)
      && recordedAt >= startedAt
      && (!Number.isFinite(endedAt) || recordedAt <= endedAt);
  });
}

const stageResultBlueprints = {
  requirement_review: {
    label: "需求评审",
    artifact: "需求评审报告",
    objective: "确认需求范围、指标口径、回溯边界与验收标准。",
    summary: "需求内容已完成结构化评审，研发边界和验收条件已经明确。",
    findingLabels: ["报表", "维度", "回溯范围", "验收标准"],
    nextStep: "请在右侧流程区确认需求评审报告，确认后进入数仓调研。",
  },
  warehouse_research: {
    label: "数仓调研",
    artifact: "数仓调研报告",
    objective: "定位来源字段、目标物理表、生产链路与调度依赖。",
    summary: "调研所需资产和链路已经定位，可据此进入模型设计。",
    findingLabels: ["来源字段", "来源表", "目标表", "生产链路", "调度依赖"],
    nextStep: "请在右侧流程区确认数仓调研报告，确认后进入模型设计。",
  },
  model_design: {
    label: "模型设计",
    artifact: "模型设计报告",
    objective: "确定目标字段、聚合粒度、空值策略与回溯方案。",
    summary: "模型变更范围已经固定，现有指标口径不会被改写。",
    findingLabels: ["新增字段", "聚合粒度", "粒度", "空值处理", "指标口径", "回溯方式"],
    nextStep: "请在右侧流程区确认模型设计报告，确认后进入数据开发。",
  },
  data_development: {
    label: "数据开发",
    artifact: "数仓开发结果",
    objective: "生成可评审的 ETL、分区策略、调度配置与回溯方案。",
    summary: "代码范围与模型设计保持一致，ETL、分区和调度方案已经明确。",
    findingLabels: ["目标表", "分区策略", "调度时间", "上游依赖", "回溯方式"],
    nextStep: "请在右侧流程区确认数据开发结果，确认后进入数据验证。",
  },
  data_validation: {
    label: "数据验证",
    artifact: "数据验证结果",
    objective: "生成覆盖口径、质量、回溯完整性与性能的验收 SQL。",
    summary: "验证规则已经覆盖口径、质量、回溯完整性与性能要求。",
    findingLabels: ["覆盖范围", "一致性", "空值率", "分区连续性", "记录数", "性能"],
    nextStep: "请在右侧流程区确认数据验证结果，确认后进入方案审查。",
  },
  solution_review: {
    label: "方案审查",
    artifact: "方案审查报告",
    objective: "综合审查需求、模型、代码和验证结果，确认方案完整性与上线风险。",
    summary: "方案范围、实现结果、验证覆盖和上线风险已经完成综合审查。",
    findingLabels: ["审查范围", "需求一致性", "模型一致性", "验证覆盖", "上线风险", "审查结论"],
    nextStep: "方案审查报告等待确认；确认后完成流程。",
  },
};

function confirmationStageFromSnapshot(snapshot) {
  const reason = snapshot.workflow_pause_reason || snapshot.reason;
  const resumeStage = snapshot.workflow_resume_stage || snapshot.resume_stage;
  const currentStage = snapshot.workflow_stage || snapshot.current_stage;
  if (resumeStage === "warehouse_research" && isRequirementReviewConfirmationReason(reason)) return "requirement_review";
  if (resumeStage === "model_design" && isWarehouseResearchConfirmationReason(reason)) return "warehouse_research";
  if (resumeStage === "data_development" && isModelDesignConfirmationReason(reason)) return "model_design";
  if (resumeStage === "data_validation" && isDataDevelopmentConfirmationReason(reason)) return "data_development";
  if (resumeStage === "solution_review" && isDataValidationConfirmationReason(reason)) return "data_validation";
  if (currentStage === "solution_review" && isSolutionReviewConfirmationReason(reason)) return "solution_review";
  return "";
}

function stageFromMessageContent(content) {
  const value = String(content || "");
  return Object.entries(stageResultBlueprints).find(([, blueprint]) => (
    value.includes(blueprint.artifact) || value.includes(`${blueprint.label}已完成`)
  ))?.[0] || "";
}

function materialStageFromSnapshot(snapshot) {
  return Object.entries(snapshot.review_gates?.stages || {}).find(([, gate]) => (
    gate.status === "awaiting_materials" || listFrom(gate.missing_materials).length
  ))?.[0] || "";
}

function stageResultItems(stage, events) {
  return listFrom(events)
    .filter((event) => (event.stage || event.current_stage) === stage)
    .flatMap((event) => listFrom(event.detail?.groups))
    .flatMap((group) => listFrom(group.items))
    .map((item) => ({
      label: String(item.label || "").trim(),
      value: String(item.value || "").trim(),
    }))
    .filter((item) => item.label && item.value);
}

function stageResultFindings(stage, events, content) {
  const blueprint = stageResultBlueprints[stage];
  const items = stageResultItems(stage, events);
  const preferred = blueprint.findingLabels
    .map((label) => items.find((item) => item.label === label))
    .filter(Boolean);
  const selected = [...preferred, ...items.filter((item) => !preferred.includes(item))].slice(0, 4);
  if (selected.length) return selected.map((item) => `${item.label}：${item.value}`);
  return String(content || "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter((line) => line && !line.startsWith("#") && !line.includes("需求 ID") && !line.includes("流程区"))
    .slice(0, 4);
}

const stageExecutionSummaryFallbacks = {
  requirement_review: [
    "已读取需求正文和附件，完成文本、表格及图片内容解析。",
    "已提取报表范围、指标维度、时间边界和验收条件，并完成结构化整理。",
    "已综合需求范围和验收条件形成评审结论，阶段报告已生成并等待确认。",
  ],
  warehouse_research: [
    "已检索相关数仓资产，并筛选出可复用的候选数据来源。",
    "已核对目标物理表、关键字段、数据粒度及现有指标口径。",
    "已梳理生产链路、分区依赖和调度关系，形成调研结论。",
  ],
  model_design: [
    "已核对目标模型结构、分区方式及当前聚合粒度。",
    "已评估字段变更对聚合层级、数据量和现有指标的影响。",
    "已形成字段映射、空值策略和历史数据处理方案。",
  ],
  data_development: [
    "已根据模型方案生成 ETL 逻辑，并完成关键字段映射。",
    "已补充分区写入策略、上游依赖和任务调度配置。",
    "已生成历史数据回溯方案，并核对执行边界。",
  ],
  data_validation: [
    "已将验收标准转换为一致性、质量和完整性验证规则。",
    "已生成对应校验 SQL，当前仅生成脚本、不连接真实数仓执行。",
    "已核对规则覆盖范围、通过条件和性能对比要求。",
  ],
  solution_review: [
    "已汇总需求评审、模型设计、数据开发和数据验证结论。",
    "已核对实现结果与原始需求、指标口径及上线边界的一致性。",
    "已识别剩余风险并形成最终方案审查结论。",
  ],
};

function simulatedStageExecutionSummary(stage, index) {
  const stageFallbacks = stageExecutionSummaryFallbacks[stage] || [];
  const genericFallbacks = [
    "已完成输入信息核对，相关材料可用于后续处理。",
    "已完成关键信息整理，并对处理范围和约束条件进行确认。",
    "已形成本次执行结果，相关内容已汇总至阶段产物。",
  ];
  return stageFallbacks[index] || genericFallbacks[index] || genericFallbacks.at(-1);
}

function stageExecutionSummary(event, stage, index) {
  const detail = event?.detail || {};
  const explicitSummary = String(detail.summary || "").trim();
  if (explicitSummary) return explicitSummary;
  const groups = listFrom(detail.groups)
    .map((group) => {
      const items = listFrom(group.items)
        .map((item) => {
          const label = String(item?.label || "").trim();
          const value = String(item?.value || "").trim();
          return label && value ? `${label}：${value}` : (label || value);
        })
        .filter(Boolean);
      if (!items.length) return "";
      const title = String(group?.title || "").trim();
      return title ? `${title}：${items.join("；")}` : items.join("；");
    })
    .filter(Boolean);
  return groups.join("\n") || simulatedStageExecutionSummary(stage, index);
}

function stageResultExecution(stage, events) {
  const stageEvents = listFrom(events)
    .filter((event) => (event.stage || event.current_stage) === stage && event.type !== "result");
  const detailedEvents = stageEvents.filter((event) => (
    String(event.message || "").trim()
    && (event.activity_status === "completed" || event.detail)
  ));
  const itemEvents = (detailedEvents.length ? detailedEvents : stageEvents)
    .filter((event, index, candidates) => {
      const message = String(event.message || "").trim();
      return message && candidates.findIndex((candidate) => String(candidate.message || "").trim() === message) === index;
    })
    .slice(-3);
  const recordedTimes = stageEvents
    .map((event) => Date.parse(event.recorded_at || event.created_at || ""))
    .filter(Number.isFinite);
  const durationMs = recordedTimes.length > 1
    ? Math.max(...recordedTimes) - Math.min(...recordedTimes)
    : 0;
  return {
    label: `执行详情 · 已完成 ${itemEvents.length} 项`,
    duration_label: durationMs ? `耗时 ${formatElapsed(durationMs)}` : "",
    items: itemEvents.map((event, index) => ({
      label: String(event.message || "").trim(),
      summary: stageExecutionSummary(event, stage, index),
    })),
  };
}

function stageResultFromWorkflowSnapshot(message, snapshot, events) {
  const confirmationStage = confirmationStageFromSnapshot(snapshot);
  const materialStage = materialStageFromSnapshot(snapshot);
  const contentStage = stageFromMessageContent(message.content);
  const stage = contentStage || confirmationStage || materialStage;
  const blueprint = stageResultBlueprints[stage];
  if (!blueprint) return null;
  const gate = snapshot.review_gates?.stages?.[stage] || {};
  if (!gate.status && stage !== confirmationStage && stage !== materialStage) return null;
  const blocked = gate.status === "awaiting_materials" || (
    stage === materialStage && listFrom(gate.missing_materials).length > 0
  );
  const messageHasStageArtifact = contentStage === stage && listFrom(message.artifacts).length > 0;
  const awaitingConfirmation = gate.status === "awaiting_confirmation" || stage === confirmationStage || messageHasStageArtifact;
  const nextStage = workflowStageBlueprint[workflowStageBlueprint.findIndex((item) => item.id === stage) + 1];
  const missingMaterials = listFrom(gate.missing_materials)
    .map((item) => String(item?.label || item?.name || item || "").trim())
    .filter(Boolean);
  return {
    stage,
    stage_label: blueprint.label,
    state: blocked ? "blocked" : (awaitingConfirmation ? "awaiting_confirmation" : "completed"),
    state_label: blocked ? "需补充材料" : (awaitingConfirmation ? "待确认" : "已完成"),
    gate_label: blocked ? `${missingMaterials.length} 项待补` : (awaitingConfirmation ? "待确认" : "已确认"),
    objective: blueprint.objective,
    summary: blocked
      ? `当前信息不足以形成${blueprint.label}结论，以下 ${missingMaterials.length} 项材料补齐并通过校验后将自动续跑。`
      : `${blueprint.artifact}${awaitingConfirmation ? "已生成" : "已确认"}。${blueprint.summary}`,
    execution: stageResultExecution(stage, events),
    findings: blocked ? missingMaterials : stageResultFindings(stage, events, message.content),
    artifact: { name: blueprint.artifact, version: gate.version || "V1.0" },
    next_step: blocked
      ? ""
      : (awaitingConfirmation
      ? blueprint.nextStep
      : (nextStage
        ? `${blueprint.artifact}已确认，流程已进入${nextStage.label}。`
        : "方案审查报告已确认，数仓研发需求流程已完成。")),
  };
}

function hydrateWorkflowMessage(message, conversation, runningPlaceholder = false) {
  if (conversation.intent !== "requirement" || !conversation.workflow_status) return;
  if (!runningPlaceholder && message.route?.intent !== "requirement") return;
  if (!runningPlaceholder && isInlineMaterialValidationMessage(message)) return;
  message.workflowStages = newWorkflowStages();
  message.workflowEvents = workflowEventsForMessage(message, conversation, runningPlaceholder);
  const completedStages = new Set(
    message.workflowEvents.flatMap((event) => listFrom(event.completed_stages)),
  );
  const currentIndex = workflowStageBlueprint.findIndex((stage) => stage.id === conversation.workflow_stage);
  message.workflowStages.forEach((stage, index) => {
    if (completedStages.has(stage.id) || (currentIndex >= 0 && index < currentIndex)) {
      stage.status = "completed";
    } else if (index === currentIndex) {
      stage.status = conversation.workflow_status === "paused"
        ? "paused"
        : (conversation.workflow_status === "stopped" ? "stopped" : "running");
    }
  });
  message.workflowMessage = conversation.workflow_status === "paused"
    ? (conversation.workflow_stage === "solution_review"
      && isSolutionReviewConfirmationReason(conversation.workflow_pause_reason)
      ? "方案审查报告已生成，等待确认完成"
      : (conversation.workflow_resume_stage === "warehouse_research"
        && isRequirementReviewConfirmationReason(conversation.workflow_pause_reason)
        ? "需求评审报告已生成，等待确认"
        : (conversation.workflow_resume_stage === "model_design"
          && isWarehouseResearchConfirmationReason(conversation.workflow_pause_reason)
          ? "数仓调研报告已生成，等待确认"
          : (conversation.workflow_resume_stage === "data_development"
            && isModelDesignConfirmationReason(conversation.workflow_pause_reason)
            ? "模型设计报告已生成，等待确认"
            : (conversation.workflow_resume_stage === "data_validation"
              && isDataDevelopmentConfirmationReason(conversation.workflow_pause_reason)
              ? "数据开发结果已生成，等待确认"
              : (conversation.workflow_resume_stage === "solution_review"
                && isDataValidationConfirmationReason(conversation.workflow_pause_reason)
                ? "数据验证结果已生成，等待确认"
                : `${conversation.workflow_stage_label || "当前阶段"}需要补充材料`))))))
    : (conversation.workflow_status === "stopped"
      ? `${conversation.workflow_stage_label || "当前阶段"}已停止，现有进度已保留`
      : (conversation.workflow_status === "completed" ? "数仓研发需求流程已完成" : `${conversation.workflow_stage_label || "需求流程"}正在处理`));
  message.requirementId = conversation.requirement_id || "";
  if (appState.isDemoConversation && !runningPlaceholder && !message.stage_result) {
    message.stage_result = stageResultFromWorkflowSnapshot(message, conversation, message.workflowEvents);
  }
}

function applyWorkflowEvent(message, payload) {
  if (!message.workflowStages) message.workflowStages = newWorkflowStages();
  const stageId = payload.stage || payload.current_stage || "";
  const stage = message.workflowStages.find((item) => item.id === stageId);
  const completedStages = new Set(payload.completed_stages || []);
  message.workflowStages.forEach((item) => {
    if (completedStages.has(item.id)) item.status = "completed";
  });
  if (payload.type === "result" && payload.status === "completed") {
    message.workflowStages.forEach((item) => { item.status = "completed"; });
  } else if (stage) {
    stage.status = ["completed", "paused", "stopped"].includes(payload.status)
      ? payload.status
      : "running";
  }
  message.workflowMessage = payload.message || payload.reason || message.workflowMessage || "";
  appendActivity(message, payload.message || (
    payload.status === "paused"
      ? (payload.current_stage === "solution_review" && isSolutionReviewConfirmationReason(payload.reason)
        ? "方案审查报告已生成，等待确认完成。"
        : (payload.resume_stage === "warehouse_research" && isRequirementReviewConfirmationReason(payload.reason)
          ? "需求评审报告已生成，等待确认后继续。"
          : (payload.resume_stage === "model_design" && isWarehouseResearchConfirmationReason(payload.reason)
            ? "数仓调研报告已生成，等待确认后继续。"
            : (payload.resume_stage === "data_development" && isModelDesignConfirmationReason(payload.reason)
              ? "模型设计报告已生成，等待确认后继续。"
              : (payload.resume_stage === "data_validation" && isDataDevelopmentConfirmationReason(payload.reason)
                ? "数据开发结果已生成，等待确认后继续。"
                : (payload.resume_stage === "solution_review" && isDataValidationConfirmationReason(payload.reason)
                  ? "数据验证结果已生成，等待确认后继续。"
                  : `${payload.current_stage_label || "当前阶段"}需要补充：${payload.reason || "缺少必要材料"}`))))))
      : ""
  ));
  message.requirementId = payload.requirement_id || message.requirementId || "";
}

function materialCardContext(message) {
  const result = message?.stage_result;
  if (result?.state !== "blocked" || !result.stage) return null;
  const stage = result.stage;
  const currentGate = appState.reviewGates?.stages?.[stage] || {};
  const labels = listFrom(result.findings)
    .map((item) => String(item || "").trim().replace(/[。.!！?？]+$/, ""))
    .filter(Boolean);
  if (!labels.length) return null;
  const currentMaterials = listFrom(currentGate.missing_materials).map(normalizeMissingMaterial);
  const remainingKeys = new Set(currentMaterials.map((item) => materialLabelKey(item.label)));
  const active = ["awaiting_materials", "checking"].includes(currentGate.status || "awaiting_materials");
  return {
    stage,
    gate: {
      ...currentGate,
      stage,
      stage_label: currentGate.stage_label || result.stage_label,
      status: currentGate.status || "awaiting_materials",
      missing_materials: labels.map((label, index) => ({
        id: `material-record-${index + 1}`,
        label,
        status: active && (!currentMaterials.length || remainingKeys.has(materialLabelKey(label))) ? "pending" : "accepted",
      })),
    },
  };
}

function appendMissingMaterialsMessage(context = null, parent = elements.messageList) {
  const active = context || activeMaterialGate(["awaiting_materials", "checking"]);
  if (!active) return false;
  const { stage, gate } = active;
  const counts = materialGateCounts(stage, gate);
  const materials = counts.materials;
  const resolved = ["awaiting_confirmation", "passed"].includes(gate.status);
  const validKeys = new Set(materials.filter((material) => material.status !== "accepted").map((material) => materialSelectionKey(stage, material)));
  appState.selectedMaterialIds = new Set([...appState.selectedMaterialIds].filter((key) => validKeys.has(key)));
  const article = document.createElement("article");
  article.className = `message assistant review-material-message${resolved ? " is-resolved" : ""}`;
  article.dataset.materialStage = stage;
  const rows = materials.length
    ? materials.map((material, index) => {
        const key = materialSelectionKey(stage, material);
        const status = material.status === "accepted" ? "accepted" : "open";
        const selected = appState.selectedMaterialIds.has(key);
        const state = status === "accepted"
          ? `${icon("circle-check")}已补充`
          : `${icon("circle-dashed")}待补充`;
        const selectButton = status === "open" && !appState.pendingMaterialSubmission
          ? `<button class="command-button review-material-select${selected ? " is-selected" : ""}" type="button" data-material-key="${escapeHtml(key)}" aria-pressed="${selected}">${icon(selected ? "check" : "plus")}<span>${selected ? "已选择" : "选择"}</span></button>`
          : "";
        return `<li class="review-material-item is-${status}">
          <span class="review-material-index" aria-hidden="true">${index + 1}</span>
          <span class="review-material-copy"><strong>${escapeHtml(material.label)}</strong><small>用于解除${escapeHtml(gate.stage_label || "当前阶段")}的输入阻塞。</small><em>可提供：文字说明、链接、配置截图或相关附件。</em></span>
          <span class="review-material-actions"><span class="review-material-state">${state}</span>${selectButton}</span>
        </li>`;
      }).join("")
    : `<li class="review-material-item is-empty"><span>${icon("file-question")}需要补充当前阶段的必要材料</span></li>`;
  const selectedCount = materials.filter((material) => appState.selectedMaterialIds.has(materialSelectionKey(stage, material))).length;
  article.innerHTML = `<div class="message-body"><section class="review-material-content" aria-label="待补充材料">
    <header><div><strong>${resolved ? "已补充" : "需要补充"} ${counts.total} 项内容</strong><p>${resolved ? "补充材料已核对，并已用于继续当前阶段。" : "可选择一项或多项，输入内容将与所选项目关联。"}</p></div><span>${counts.accepted} / ${counts.total} 已补充</span></header>
    <ul>${rows}</ul>
    <footer><span class="review-material-selection">${resolved ? "全部材料已补充，当前阶段已继续" : (appState.pendingMaterialSubmission ? "补充内容已提交，等待处理结果" : (selectedCount ? `已关联 ${selectedCount} 项，可在下方输入或上传材料` : "选择本次需要补充的内容"))}</span></footer>
  </section></div>`;
  article.querySelectorAll("button[data-material-key]").forEach((button) => {
    button.addEventListener("click", () => {
      if (appState.selectedMaterialIds.has(button.dataset.materialKey)) appState.selectedMaterialIds.delete(button.dataset.materialKey);
      else appState.selectedMaterialIds.add(button.dataset.materialKey);
      syncMaterialSupplementContext(stage, gate, materials);
      syncMaterialSelectionUi(stage);
    });
  });
  parent.appendChild(article);
  return true;
}

function scrollToMissingMaterials() {
  const target = elements.messageList.querySelector(".review-material-message");
  if (!target) {
    showToast("当前没有待补充内容");
    return;
  }
  if (window.innerWidth <= 1180) setWorkflowDrawer(false);
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("is-material-target");
    window.requestAnimationFrame(() => target.classList.add("is-material-target"));
  });
}

function renderRequirementIntentAnalysis(disclosureScope, route = {}) {
  const intentAnalysisKey = `${disclosureScope}:intent-analysis-execution`;
  const analysis = route.intent_analysis && typeof route.intent_analysis === "object"
    ? route.intent_analysis
    : null;
  if (!analysis) return "";
  const recognizedLabel = String(route.label || "").trim();
  const routeSkill = route.skill && typeof route.skill === "object" ? route.skill : {};
  const routeSkillName = String(routeSkill.name || "").trim();
  const routeSkillVersion = String(routeSkill.version || "").trim();
  const nextAction = String(route.next_action || "").trim();
  const items = listFrom(analysis.items);
  const itemHtml = items.map((item, index) => {
    const itemKey = `${intentAnalysisKey}:item-${index}`;
    const status = String(item?.status || "");
    const completed = status === "completed";
    const summary = String(item?.summary || "");
    return `<li><details class="stage-result-execution-item" data-disclosure-key="${escapeHtml(itemKey)}">
      <summary><span class="stage-result-execution-status">${icon(completed ? "check" : "loader-circle")}</span><span>${escapeHtml(item?.label || "")}</span><span class="stage-result-execution-chevron">${icon("chevron-right")}</span></summary>
      <div class="stage-result-execution-summary">
        <header><span>执行摘要</span><button type="button" data-stage-execution-copy="${escapeHtml(summary)}" aria-label="复制执行摘要" title="复制执行摘要">${icon("copy")}</button></header>
        <p>${escapeHtml(summary)}</p>
      </div>
    </details></li>`;
  }).join("");
  const completedCount = Number(analysis.completed_count);
  const countLabel = Number.isFinite(completedCount) ? ` · 已完成 ${completedCount} 项` : "";
  const hasDuration = Object.hasOwn(analysis, "duration_ms") && Number.isFinite(Number(analysis.duration_ms));
  const durationLabel = hasDuration
    ? `<span class="stage-result-execution-duration">耗时 ${formatElapsed(Number(analysis.duration_ms))}</span>`
    : "";
  return `<section class="stage-intent-analysis" data-intent-analysis-stage="requirement_review">
    ${analysis.summary ? `<p>${escapeHtml(analysis.summary)}</p>` : ""}
    <details class="stage-result-execution stage-intent-execution" data-disclosure-key="${escapeHtml(intentAnalysisKey)}">
      <summary>${icon("chevron-right")}<span>执行详情${escapeHtml(countLabel)}</span>${durationLabel}</summary>
      <ul>${itemHtml}</ul>
    </details>
    ${recognizedLabel ? `<p class="stage-intent-result">已识别为 <span class="stage-intent-label">${escapeHtml(recognizedLabel)}</span>${routeSkillName ? `，将调用 <span class="stage-skill-invocation">${escapeHtml(routeSkillName)}${routeSkillVersion ? ` ${escapeHtml(routeSkillVersion)}` : ""}</span>` : ""}${nextAction ? `，${escapeHtml(nextAction)}` : ""}。</p>` : ""}
  </section>`;
}

function renderWorkflowExecutionDisclosure(events, disclosureScope, demoExecution = {}) {
  const backendExecution = [...listFrom(events)].reverse().find((event) => (
    event?.execution && typeof event.execution === "object"
  ))?.execution;
  const execution = backendExecution || (appState.isDemoConversation ? demoExecution : {});
  const items = listFrom(execution.items).filter((item) => String(item?.label || item || "").trim());
  if (!items.length) return "";
  const label = String(execution.label || "执行详情").trim();
  const completedCount = Number(execution.completed_count);
  const countLabel = Object.hasOwn(execution, "completed_count") && Number.isFinite(completedCount)
    ? ` · 已完成 ${completedCount} 项`
    : "";
  const durationMs = Number(execution.duration_ms);
  const explicitDurationLabel = String(execution.duration_label || "").trim();
  const durationLabel = Object.hasOwn(execution, "duration_ms") && Number.isFinite(durationMs)
    ? `<span class="stage-result-execution-duration">耗时 ${formatElapsed(durationMs)}</span>`
    : (explicitDurationLabel ? `<span class="stage-result-execution-duration">${escapeHtml(explicitDurationLabel)}</span>` : "");
  const executionKey = `${disclosureScope}:workflow-execution`;
  const itemHtml = items.map((item, index) => {
    const itemKey = `${executionKey}:item-${String(item?.id || index)}`;
    const itemLabel = String(item?.label || item || "").trim();
    const itemStatus = String(item?.status || "completed");
    const completed = itemStatus === "completed";
    const summary = String(item?.summary || "").trim();
    const detail = item?.detail && typeof item.detail === "object" ? item.detail : null;
    const hasDetail = Boolean(summary || listFrom(detail?.groups).length);
    return `<li><details class="stage-result-execution-item" data-disclosure-key="${escapeHtml(itemKey)}">
      <summary><span class="stage-result-execution-status">${icon(completed ? "check" : "loader-circle")}</span><span>${escapeHtml(itemLabel)}</span><span class="stage-result-execution-chevron">${icon("chevron-right")}</span></summary>
      ${hasDetail ? `<div class="stage-result-execution-summary">
        ${summary ? `<header><span>执行摘要</span><button type="button" data-stage-execution-copy="${escapeHtml(summary)}" aria-label="复制执行摘要" title="复制执行摘要">${icon("copy")}</button></header><p>${escapeHtml(summary).replace(/\n/g, "<br>")}</p>` : ""}
        ${renderExecutionResultDetail(detail, itemKey)}
      </div>` : ""}
    </details></li>`;
  }).join("");
  return `<details class="stage-result-execution stage-workflow-execution" data-disclosure-key="${escapeHtml(executionKey)}">
    <summary>${icon("chevron-right")}<span>${escapeHtml(label)}${escapeHtml(countLabel)}</span>${durationLabel}</summary>
    <ul>${itemHtml}</ul>
  </details>`;
}

function renderStageNextStep(value) {
  const stageLabels = new Set(["需求评审", "数仓调研", "模型设计", "数据开发", "数据验证", "方案审查"]);
  return String(value || "")
    .split(/(需求评审|数仓调研|模型设计|数据开发|数据验证|方案审查)/g)
    .filter(Boolean)
    .map((part) => stageLabels.has(part)
      ? `<strong class="stage-result-next-stage">${escapeHtml(part)}</strong>`
      : escapeHtml(part))
    .join("");
}

function renderStageResult(message, disclosureScope, showIntentResult = true, confirmedChoiceReceipt = "", stageResponse = "") {
  const result = message.stage_result;
  if (!result) return "";
  const executionItems = listFrom(result.execution?.items).filter(Boolean);
  const hasWorkflowExecutionStream = listFrom(message.workflowEvents).some((event) => (
    String(event?.activity_step || "").trim()
  ));
  const choiceConfirmation = result.state === "needs_confirmation" ? message.confirmation_request : null;
  const choiceConfirmed = choiceConfirmation?.status === "confirmed";
  const reportAwaitingConfirmation = result.state === "awaiting_confirmation" || result.gate_label === "待确认";
  const awaitingConfirmation = reportAwaitingConfirmation || (choiceConfirmation && !choiceConfirmed);
  const stateClass = result.state === "blocked" ? "blocked" : (awaitingConfirmation ? "awaiting-confirmation" : "completed");
  const showOutcome = !choiceConfirmation && Boolean(result.summary || result.next_step);
  const executionKey = `${disclosureScope}:stage-result-execution`;
  const showRequirementIntent = showIntentResult
    && result.stage === "requirement_review"
    && message.route?.intent === "requirement";
  const intentResult = showRequirementIntent
    ? renderRequirementIntentAnalysis(disclosureScope, message.route)
    : "";
  const executionItemHtml = executionItems.map((item, index) => {
    const label = String(item?.label || item || "").trim();
    const summary = String(item?.summary || "").trim();
    const itemKey = `${executionKey}:item-${index}`;
    return `<li><details class="stage-result-execution-item" data-disclosure-key="${escapeHtml(itemKey)}">
      <summary><span class="stage-result-execution-status">${icon("check")}</span><span>${escapeHtml(label)}</span><span class="stage-result-execution-chevron">${icon("chevron-right")}</span></summary>
      ${summary ? `<div class="stage-result-execution-summary">
        <header><span>执行摘要</span><button type="button" data-stage-execution-copy="${escapeHtml(summary)}" aria-label="复制执行摘要" title="复制执行摘要">${icon("copy")}</button></header>
        <p>${escapeHtml(summary).replace(/\n/g, "<br>")}</p>
      </div>` : ""}
    </details></li>`;
  }).join("");
  return `${intentResult}<section class="stage-result is-${stateClass}" data-stage-result="${escapeHtml(result.stage || "")}">
    ${confirmedChoiceReceipt}
    ${stageResponse}
    ${executionItems.length && !hasWorkflowExecutionStream ? `<details class="stage-result-execution" data-disclosure-key="${escapeHtml(executionKey)}">
      <summary>${icon("chevron-right")}<span>${escapeHtml(result.execution?.label || "执行详情")}</span>${result.execution?.duration_label ? `<span class="stage-result-execution-duration">${escapeHtml(result.execution.duration_label)}</span>` : ""}</summary>
      <ul>${executionItemHtml}</ul>
    </details>` : ""}
    ${choiceConfirmation && result.summary ? `<p class="stage-result-execution-result">${escapeHtml(result.summary)}</p>` : ""}
    ${showOutcome ? `<p class="stage-result-outcome">${result.summary ? escapeHtml(result.summary) : ""}${result.summary && result.next_step ? " " : ""}${result.next_step ? `<strong>下一步：</strong>${renderStageNextStep(result.next_step)}` : ""}</p>` : ""}
  </section>`;
}

function confirmationReceiptTitle(request) {
  const explicitTitle = String(request.confirmed_title || "").trim();
  if (explicitTitle) return explicitTitle;
  const title = String(request.title || "确认结果").replace(/^需要确认[：:]\s*/, "").replace(/[？?]\s*$/, "");
  return title.includes("等级标签") && title.includes("口径") ? "等级标签口径" : title;
}

function selectionPromptTitle(request) {
  const title = String(request.title || "请选择处理口径").trim();
  if (/^需要确认[：:]/.test(title)) return title.replace(/^需要确认[：:]\s*/, "请选择：");
  return title;
}

function renderStageConfirmationRequest(message) {
  const request = message.confirmation_request;
  if (!request) return "";
  const options = listFrom(request.options);
  const confirmed = request.status === "confirmed";
  const selectedValue = String(request.selected_value || "");
  const selectedOption = options.find((option) => String(option.value || "") === selectedValue);
  const inputName = `stage-confirmation-${message.id || request.id}`;
  if (confirmed) {
    return `<section class="stage-confirmation-request is-confirmed is-receipt" data-stage-confirmation-id="${escapeHtml(request.id || "")}">
      <header><strong>${escapeHtml(confirmationReceiptTitle(request))}</strong><span>${icon("circle-check")}已采用</span></header>
      ${selectedOption ? `<div class="stage-confirmation-selection">
        <span class="stage-confirmation-selection-icon">${icon("check")}</span>
        <span><strong>${escapeHtml(selectedOption.label || selectedOption.value || selectedValue)}</strong>${selectedOption.description ? `<small>${escapeHtml(selectedOption.description)}</small>` : ""}</span>
        ${selectedOption.recommended ? `<em>推荐</em>` : ""}
      </div>` : ""}
    </section>`;
  }
  return `<section class="stage-confirmation-request" data-stage-confirmation-id="${escapeHtml(request.id || "")}">
    <header><strong>${escapeHtml(selectionPromptTitle(request))}</strong></header>
    ${request.description ? `<p>${escapeHtml(request.description)}</p>` : ""}
    <fieldset>${options.map((option) => `
      <label class="stage-confirmation-option">
        <input type="radio" name="${escapeHtml(inputName)}" value="${escapeHtml(option.value || "")}" data-stage-confirmation-option ${String(option.value || "") === selectedValue ? "checked" : ""}>
        <span><strong>${escapeHtml(option.label || option.value || "")}</strong><small>${escapeHtml(option.description || "")}</small></span>
        ${option.recommended ? `<em>推荐</em>` : ""}
      </label>`).join("")}</fieldset>
    <footer><button class="command-button primary" type="button" data-stage-confirmation-submit>${icon("check")}<span>采用此口径</span></button></footer>
  </section>`;
}

function renderConfirmedChoiceResponse(message) {
  const request = message?.confirmation_request;
  if (!request || request.status !== "confirmed") return "";
  const selectedValue = String(request.selected_value || "");
  const selectedOption = listFrom(request.options).find((option) => String(option.value || "") === selectedValue);
  const selectedLabel = String(selectedOption?.label || selectedValue).trim();
  if (!selectedLabel) return "";
  return `<p class="stage-agent-response">收到，已采用 <strong>${escapeHtml(selectedLabel)}</strong> 作为本次需求的等级标签口径。我会据此${renderWorkflowSkillInvocation("requirement_review")}，继续解析维度定义、历史回溯范围和验收条件，并完成需求评审报告。</p>`;
}

function renderStageHandoffResponse(messageIndex, message) {
  const priorUser = [...appState.messages.slice(0, messageIndex)].reverse().find((candidate) => candidate.role === "user");
  if (!priorUser) return "";
  const priorContent = String(priorUser.content || "");
  const hasSupplement = listFrom(priorUser.supplementItems).length || parseSupplementContent(priorContent).items.length;
  if (hasSupplement) {
    const stage = message.stage_result?.stage || "";
    const blockedMessage = [...appState.messages.slice(0, messageIndex)].reverse().find((candidate) => (
      candidate.stage_result?.stage === stage && candidate.stage_result?.state === "blocked"
    ));
    const total = listFrom(blockedMessage?.stage_result?.findings).length || listFrom(priorUser.supplementItems).length;
    const stageLabel = message.stage_result?.stage_label || workflowStageBlueprint.find((item) => item.id === stage)?.label || "当前阶段";
    return `<p class="stage-agent-response">收到，${total ? `${total} 项补充材料` : "补充材料"}已核对完成。我已据此${renderWorkflowSkillInvocation(stage)}，继续${escapeHtml(stageLabel)}。</p>`;
  }
  if (!/^确认「.+」无误$/.test(priorContent.trim())) return "";
  const responses = {
    warehouse_research: ["收到。我会以已确认的需求范围和口径为依据，", "，继续开展数仓调研。"],
    model_design: ["收到。我会基于已定位的数据资产和生产链路，", "，继续完成模型设计。"],
    data_development: ["收到。我会按照已确认的模型方案，", "，继续生成数据开发结果。"],
    data_validation: ["收到。我会基于已生成的代码和验收标准，", "，继续完成数据验证。"],
    solution_review: ["收到。我会综合需求、模型、代码和验证结果，", "，继续完成方案审查。"],
  };
  const response = responses[message.stage_result?.stage];
  return response
    ? `<p class="stage-agent-response">${escapeHtml(response[0])}${renderWorkflowSkillInvocation(message.stage_result?.stage)}${escapeHtml(response[1])}</p>`
    : "";
}

function renderMaterialSupplementResult(messageIndex, message) {
  const priorUser = [...appState.messages.slice(0, messageIndex)].reverse().find((candidate) => candidate.role === "user");
  const items = listFrom(priorUser?.supplementItems).length
    ? listFrom(priorUser.supplementItems)
    : parseSupplementContent(priorUser?.content || "").items;
  const accepted = Number(String(message.content || "").match(/已补充\s*(\d+)\s*项/)?.[1] || items.length);
  const remaining = Number(String(message.content || "").match(/仍有\s*(\d+)\s*项/)?.[1] || 0);
  const stage = activeMaterialGate(["awaiting_materials", "checking"])?.stage || "warehouse_research";
  const stageLabel = workflowStageBlueprint.find((item) => item.id === stage)?.label || "当前阶段";
  const syntheticMessage = {
    stage_result: {
      stage,
      stage_label: stageLabel,
      state: "blocked",
      summary: `本次提交的 ${accepted} 项材料已核对完成，仍有 ${remaining} 项材料待补充。全部补齐后将自动续跑${stageLabel}。`,
      execution: {
        label: `执行详情 · 已完成 ${items.length} 项材料核对`,
        items: items.map((item) => ({ label: item.label, summary: `已核对“${item.label}”与当前缺失项的对应关系。` })),
      },
      findings: [],
      next_step: "",
    },
  };
  const response = `<p class="stage-agent-response">收到，本次提交的 ${accepted} 项补充材料已核对完成。</p>`;
  return renderStageResult(syntheticMessage, message.executionDisclosureScope || message.id || "material-result", false, "", response);
}

function stageConfirmationReceiptContext(messageIndex, message) {
  const stage = message.stage_result?.stage || message.confirmation_request?.stage || "";
  if (!stage) return { embeddedReceipt: "", embeddedResponse: "", hideOwnReceipt: false };
  const laterReportExists = appState.messages.slice(messageIndex + 1).some((candidate) => (
    candidate.stage_result?.stage === stage && candidate.stage_result?.artifact?.name
  ));
  const ownConfirmedChoice = message.stage_result?.artifact?.name && message.confirmation_request?.status === "confirmed"
    ? message
    : null;
  const priorConfirmedChoice = message.stage_result?.artifact?.name
    ? ownConfirmedChoice || [...appState.messages.slice(0, messageIndex)].reverse().find((candidate) => (
        candidate.confirmation_request?.status === "confirmed"
        && (candidate.stage_result?.stage || candidate.confirmation_request?.stage) === stage
      ))
    : null;
  return {
    embeddedReceipt: priorConfirmedChoice ? renderStageConfirmationRequest(priorConfirmedChoice) : "",
    embeddedResponse: priorConfirmedChoice ? renderConfirmedChoiceResponse(priorConfirmedChoice) : "",
    hideOwnReceipt: Boolean(ownConfirmedChoice) || (message.confirmation_request?.status === "confirmed" && laterReportExists),
  };
}

function renderMessages() {
  const distanceFromBottom = elements.chatContent.scrollHeight
    - elements.chatContent.scrollTop
    - elements.chatContent.clientHeight;
  const shouldFollowLatest = distanceFromBottom <= 80;
  const currentMaterial = elements.messageList.querySelector(".review-material-message");
  const materialAnchorOffset = currentMaterial
    ? currentMaterial.getBoundingClientRect().top - elements.chatContent.getBoundingClientRect().top
    : null;
  captureExecutionDisclosureState();
  elements.messageList.replaceChildren();
  let initialUserMessageFound = false;
  let requirementIntentShown = false;
  appState.messages.forEach((message, messageIndex) => {
    if (appState.isDemoConversation && isInlineMaterialValidationMessage(message)) {
      if (!String(message.content || "").trim()) return;
      const article = document.createElement("article");
      article.className = "message assistant";
      if (message.id) article.id = `message-${message.id}`;
      const body = document.createElement("div");
      body.className = "message-body";
      body.innerHTML = renderMaterialSupplementResult(messageIndex, message);
      article.appendChild(body);
      elements.messageList.appendChild(article);
      return;
    }
    const article = document.createElement("article");
    article.className = `message ${message.role}`;
    if (message.queued) article.classList.add("is-queued");
    if (message.presentationEntering) article.classList.add("is-stream-complete");
    if (message.id) article.id = `message-${message.id}`;
    if (message.role === "user" && !initialUserMessageFound) {
      article.dataset.conversationAnchor = "requirement-input";
      initialUserMessageFound = true;
    }

    const body = document.createElement("div");
    body.className = "message-body";
    const messageContent = visibleMessageContent(message);

    if (message.role === "user" && listFrom(message.supplementItems).length) {
      const context = document.createElement("div");
      context.className = "user-supplement-context";
      context.innerHTML = `<small>补充材料</small><span>${message.supplementItems.length} 项</span>`;
      body.appendChild(context);
    }
    if (message.role === "user" && message.queued) {
      const queuedStatus = document.createElement("small");
      queuedStatus.className = "queued-message-status";
      queuedStatus.textContent = "排队中 · 当前任务完成后发送";
      body.appendChild(queuedStatus);
    }

    const messageActivities = normalizeMessageActivities(message);
    const metricEvents = listFrom(message.workflowEvents);
    const disclosureScope = message.executionDisclosureScope || message.id || "message";
    if (!message.executionDisclosureScope) message.executionDisclosureScope = disclosureScope;
    const hasStageResult = Boolean(message.stage_result);
    const messageThinking = Boolean(message.streaming && message.thinking !== false);
    const reasoningSummary = message.reasoningSummary || message.reasoning_summary || "";
    const isCodexMessage = message.route?.agent_type === "codex_agent";
    const showStreamingRequirementIntent = !hasStageResult
      && !requirementIntentShown
      && message.route?.intent === "requirement";
    if (showStreamingRequirementIntent) {
      const intentAnalysis = document.createElement("div");
      intentAnalysis.innerHTML = renderRequirementIntentAnalysis(disclosureScope, message.route);
      body.append(...intentAnalysis.children);
      requirementIntentShown = true;
    } else if (!hasStageResult && message.streamingAnalysis && message.route?.intent !== "requirement") {
      const analysis = document.createElement("p");
      analysis.className = "streaming-intent-analysis";
      const analysisText = String(message.streamingAnalysis);
      const intentLabel = "数仓研发需求";
      const labelStart = analysisText.indexOf(intentLabel);
      if (labelStart >= 0) {
        analysis.append(document.createTextNode(analysisText.slice(0, labelStart)));
        const label = document.createElement("span");
        label.textContent = intentLabel;
        analysis.append(label, document.createTextNode(analysisText.slice(labelStart + intentLabel.length)));
      } else {
        analysis.textContent = analysisText;
      }
      body.appendChild(analysis);
    }
    const showCompletedRequirementIntent = hasStageResult
      && !requirementIntentShown
      && message.stage_result?.stage === "requirement_review"
      && message.route?.intent === "requirement";
    if (showCompletedRequirementIntent) {
      const intentAnalysis = document.createElement("div");
      intentAnalysis.innerHTML = renderRequirementIntentAnalysis(disclosureScope, message.route);
      body.append(...intentAnalysis.children);
      requirementIntentShown = true;
    }
    const hasWorkflowExecutionStream = metricEvents.some((event) => (
      String(event?.activity_step || "").trim()
    ));
    if (!isCodexMessage && (!hasStageResult || hasWorkflowExecutionStream)
      && (metricEvents.length || messageActivities.length || message.reasoning_summary || message.reasoningSummary)) {
      const activity = document.createElement("div");
      activity.className = "activity-log";
      const thinking = messageThinking;
      activity.classList.toggle("is-thinking", thinking);
      const executionActivities = showStreamingRequirementIntent || showCompletedRequirementIntent
        ? messageActivities.filter((item) => !/^已识别为(?:完整需求|数仓研发需求)(?:[，,]|$)/.test(String(item || "").trim()))
        : messageActivities;
      activity.innerHTML = `
        <div class="activity-content">
          ${hasWorkflowExecutionStream
            ? renderWorkflowExecutionDisclosure(metricEvents, disclosureScope, message.stage_result?.execution)
            : (metricEvents.length
              ? renderExecutionDetails(metricEvents, executionActivities, thinking, reasoningSummary, disclosureScope)
              : `${renderActivityNotes(executionActivities.slice(-30), Boolean(thinking && !reasoningSummary))}${reasoningSummary ? `<div class="reasoning-summary">${escapeHtml(reasoningSummary).replace(/\n/g, "<br>")}</div>` : ""}`)}
        </div>`;
      body.appendChild(activity);
    }

    if (isCodexMessage && (messageThinking || codexTranscriptItems(message).length)) {
      const progress = document.createElement("div");
      progress.innerHTML = renderCodexTranscript(message, disclosureScope);
      body.append(...progress.children);
      if (messageThinking) {
        const working = document.createElement("div");
        working.className = "codex-working";
        working.setAttribute("role", "status");
        working.setAttribute("aria-label", "Working");
        working.innerHTML = '<span class="codex-working-dot"></span><strong>Working</strong>';
        body.appendChild(working);
      }
    }

    const showStandaloneRequirementIntent = !hasStageResult
      && !requirementIntentShown
      && !message.streaming
      && !message.streamingAnalysis
      && message.route?.intent === "requirement";
    if (showStandaloneRequirementIntent) {
      const intentAnalysis = document.createElement("div");
      intentAnalysis.innerHTML = renderRequirementIntentAnalysis(disclosureScope, message.route);
      body.append(...intentAnalysis.children);
      requirementIntentShown = true;
    }

    if (hasStageResult) {
      const stageResult = document.createElement("div");
      const showIntentResult = !requirementIntentShown
        && message.stage_result?.stage === "requirement_review"
        && message.route?.intent === "requirement";
      if (showIntentResult) requirementIntentShown = true;
      const confirmationContext = stageConfirmationReceiptContext(messageIndex, message);
      const stageResponse = appState.isDemoConversation
        ? (confirmationContext.embeddedResponse || renderStageHandoffResponse(messageIndex, message))
        : "";
      stageResult.innerHTML = `${renderStageResult(message, disclosureScope, showIntentResult, confirmationContext.embeddedReceipt, stageResponse)}${confirmationContext.hideOwnReceipt ? "" : renderStageConfirmationRequest(message)}`;
      body.append(...stageResult.children);
    } else {
      const markdown = document.createElement("div");
      markdown.className = "markdown-content";
      markdown.innerHTML = renderMarkdown(messageContent);
      body.appendChild(markdown);
    }

    if (!hasStageResult && message.artifacts?.length) {
      const chips = document.createElement("div");
      chips.className = "artifact-chips";
      message.artifacts.forEach((artifact) => {
        const button = document.createElement("button");
        const fileType = attachmentExtension(artifact.name).toUpperCase() || "FILE";
        const fileMeta = [fileType, Number(artifact.size || 0) > 0 ? formatFileSize(Number(artifact.size)) : ""]
          .filter(Boolean)
          .join(" · ");
        button.className = "artifact-chip";
        button.type = "button";
        button.dataset.kind = artifact.kind || "generated";
        button.title = artifact.name;
        button.innerHTML = `
          <span class="artifact-chip-icon">${icon(attachmentIcon(artifact.mime_type, artifact.name))}</span>
          <span class="artifact-chip-copy"><strong>${escapeHtml(artifact.name)}</strong><small>${escapeHtml(fileMeta)}</small></span>
          <span class="artifact-chip-action">${icon(artifact.kind === "attachment" ? "download" : "chevron-right")}</span>`;
        button.disabled = !artifact.content_url && !artifact.download_url;
        button.addEventListener("click", () => {
          if (artifact.kind === "attachment") {
            if (artifact.download_url) window.open(artifact.download_url, "_blank", "noopener");
            return;
          }
          openArtifact(artifact);
        });
        chips.appendChild(button);
      });
      body.appendChild(chips);
    }

    article.appendChild(body);
    elements.messageList.appendChild(article);
    const materialContext = materialCardContext(message);
    if (materialContext) appendMissingMaterialsMessage(materialContext);
  });
  elements.chatContent.classList.toggle("is-empty", appState.messages.length === 0);
  restoreExecutionDisclosureState();
  refreshIcons();
  updateElapsedTimers();
  renderWorkflowDrawer();
  if (materialAnchorOffset !== null && elements.messageList.querySelector(".review-material-message")) {
    const nextMaterial = elements.messageList.querySelector(".review-material-message");
    const nextOffset = nextMaterial.getBoundingClientRect().top - elements.chatContent.getBoundingClientRect().top;
    elements.chatContent.scrollTop += nextOffset - materialAnchorOffset;
  } else if (shouldFollowLatest) {
    window.requestAnimationFrame(() => {
      elements.chatContent.scrollTop = elements.chatContent.scrollHeight;
    });
  }
}

async function loadStatus() {
  try {
    const status = await api("/api/status");
    if (!appState.selectedModel) setSelectedModel(status.model);
  } catch (_error) {}
}

async function loadModels() {
  try {
    const query = activeSpaceId ? `?space_id=${encodeURIComponent(activeSpaceId)}` : "";
    const payload = await accountApi(`/api/models${query}`);
    const models = listFrom(payload.models)
      .map((model) => String(model?.id || "").trim())
      .filter(Boolean);
    const fallback = String(payload.default_model || "gpt-5.6-sol");
    appState.availableModels = [...new Set([fallback, ...models])];
    const saved = storedModel();
    setSelectedModel(appState.availableModels.includes(saved) ? saved : fallback);
  } catch (_error) {
    const fallback = appState.selectedModel || "gpt-5.6-sol";
    appState.availableModels = [fallback];
    setSelectedModel(fallback);
  }
}

function setWorkflowDrawer(open) {
  const allowed = Boolean(appState.intent === "requirement" || appState.requirementId);
  appState.workflowDrawerOpen = Boolean(open && allowed);
  elements.workflowDrawer.hidden = !appState.workflowDrawerOpen;
  elements.app.classList.toggle("has-workflow", appState.workflowDrawerOpen);
  elements.workflowToggle.setAttribute("aria-expanded", String(appState.workflowDrawerOpen));
  if (appState.workflowDrawerOpen) renderWorkflowDrawer();
}

function renderWorkflowDrawer() {
  if (!appState.workflowDrawerOpen) return;
  const steps = buildReviewSteps(appState.workflowEvents, {
    status: appState.workflowStatus,
    stage: appState.workflowStage,
  });
  const requirementId = appState.requirementId || "";
  elements.drawerRequirementMeta.hidden = !requirementId;
  elements.drawerRequirementId.textContent = requirementId;
  elements.drawerRequirementCopy.disabled = !requirementId;
  const reviewReport = appState.requirementFiles.find((file) => /requirement_review_report/.test(file.name || ""));
  const warehouseReport = appState.requirementFiles.find((file) => /warehouse_research_report/.test(file.name || ""));
  const modelDesignReport = appState.requirementFiles.find((file) => /model_design_report/.test(file.name || ""));
  const dataDevelopmentReport = appState.requirementFiles.find((file) => /data_development_report/.test(file.name || ""));
  const dataValidationReport = appState.requirementFiles.find((file) => /data_validation_report/.test(file.name || ""));
  const solutionReviewReport = appState.requirementFiles.find((file) => /solution_review_report/.test(file.name || ""));
  const stageReports = {
    requirement_review: reviewReport,
    warehouse_research: warehouseReport,
    model_design: modelDesignReport,
    data_development: dataDevelopmentReport,
    data_validation: dataValidationReport,
    solution_review: solutionReviewReport,
  };
  const archivedReportDefaults = {
    requirement_review: ["01_requirement_review_report.md", "需求评审报告"],
    warehouse_research: ["02_warehouse_research_report.md", "数仓调研报告"],
    model_design: ["03_model_design_report.md", "模型设计报告"],
    data_development: ["04_data_development_report.md", "数仓开发结果"],
    data_validation: ["05_data_validation_report.md", "数据验证结果"],
    solution_review: ["06_solution_review_report.md", "方案审查报告"],
  };
  Object.entries(archivedReportDefaults).forEach(([stage, [defaultName, displayName]]) => {
    const gate = appState.reviewGates?.stages?.[stage];
    if (stageReports[stage] || !requirementId || !gate?.version) return;
    const name = gate.report_file || defaultName;
    const versionBase = `/api/requirements/${encodeURIComponent(requirementId)}/review-gates/${encodeURIComponent(stage)}/versions/${encodeURIComponent(gate.version)}`;
    stageReports[stage] = {
      name,
      display_name: displayName,
      mime_type: "text/markdown",
      version: gate.version,
      requirement_id: requirementId,
      content_url: versionBase,
      download_url: `${versionBase}/download`,
    };
  });
  elements.reviewStepList.innerHTML = renderReviewStepsHtml(
    steps,
    stageReports,
    appState.reviewGates.stages || {},
  );
  elements.reviewStepList.querySelectorAll("[data-stage-report-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const report = stageReports[button.dataset.stageReportOpen];
      if (report) openArtifact(report, button.dataset.stageReportOpen);
    });
  });
  elements.reviewStepList.querySelectorAll("[data-stage-report-confirm]").forEach((button) => {
    button.addEventListener("click", () => confirmStageReview(button.dataset.stageReportConfirm));
  });
  elements.reviewStepList.querySelectorAll("[data-stage-rerun]").forEach((button) => {
    button.addEventListener("click", () => startStageRerun(button.dataset.stageRerun));
  });
  elements.reviewStepList.querySelectorAll("[data-workflow-goto-material]").forEach((button) => {
    button.addEventListener("click", scrollToMissingMaterials);
  });
  elements.reviewStepList.querySelectorAll("[data-workflow-stage-anchor]").forEach((button) => {
    button.addEventListener("click", () => scrollToWorkflowStageContent(button.dataset.workflowStageAnchor));
  });
  const lastEvent = appState.workflowEvents[appState.workflowEvents.length - 1];
  elements.reviewUpdatedAt.textContent = lastEvent?.recorded_at ? `更新于 ${new Date(lastEvent.recorded_at).toLocaleTimeString("zh-CN", { hour12: false })}` : "";

  refreshIcons();
  updateElapsedTimers();
  highlightWorkflowAnchor();
}

function scrollToWorkflowStageContent(stage) {
  const intentTarget = [...elements.messageList.querySelectorAll("[data-intent-analysis-stage]")]
    .find((item) => item.dataset.intentAnalysisStage === stage);
  const resultTarget = [...elements.messageList.querySelectorAll("[data-stage-result]")]
    .find((item) => item.dataset.stageResult === stage);
  const target = intentTarget || resultTarget;
  if (!target) {
    showToast("该阶段尚无对话内容");
    return;
  }
  if (window.innerWidth <= 1180) setWorkflowDrawer(false);
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const containerBounds = elements.chatContent.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const targetTop = elements.chatContent.scrollTop + targetBounds.top - containerBounds.top - 24;
    elements.chatContent.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    target.classList.remove("is-stage-target");
    window.requestAnimationFrame(() => target.classList.add("is-stage-target"));
  }));
}

function highlightWorkflowAnchor() {
  if (!appState.workflowAnchorStage) return;
  const target = elements.reviewStepList.querySelector(`[data-workflow-stage="${appState.workflowAnchorStage}"]`);
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "auto", block: "center" });
  });
}

async function loadReviewArtifacts(requirementId) {
  if (!requirementId) return;
  const requirement = await api(`/api/requirements/${encodeURIComponent(requirementId)}`);
  if (appState.requirementId !== requirementId) return;
  appState.requirementFiles = listFrom(requirement.files);
  appState.reviewGates = requirement.review_gates || {};
  Object.values(appState.reviewGates.stages || {}).forEach(reconcileMaterialGate);
  renderWorkflowDrawer();
  renderMessages();
}

function renderConversations() {
  const query = appState.conversationQuery.trim().toLocaleLowerCase();
  const agentConversations = appState.conversations.filter(
    (conversation) => String(conversation.agent_type || "dw_agent") === appState.agentType,
  );
  const conversations = agentConversations.filter((conversation) => !query || [
    conversation.title,
    conversation.id,
    conversation.task_label,
    conversation.intent_label,
  ].some((value) => String(value || "").toLocaleLowerCase().includes(query)));
  elements.conversationList.replaceChildren();
  if (!conversations.length) {
    const empty = document.createElement("div");
    empty.className = "empty-row";
    empty.textContent = agentConversations.length ? "没有匹配的对话" : "暂无对话";
    elements.conversationList.appendChild(empty);
    return;
  }
  conversations.forEach((conversation) => {
    const row = document.createElement("div");
    row.className = "conversation-row";
    row.classList.toggle("is-active", conversation.id === appState.conversationId);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-button";
    button.dataset.id = conversation.id;
    button.classList.toggle("is-active", conversation.id === appState.conversationId);
    const conversationIcon = conversation.generation_status === "running" ? "loader-circle" : "message-square";
    button.classList.toggle("is-running", conversation.generation_status === "running");
    button.innerHTML = `${icon(conversationIcon)}<span>${escapeHtml(conversation.title)}</span>`;
    button.addEventListener("click", () => openConversation(conversation.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "conversation-delete";
    deleteButton.setAttribute("aria-label", `删除对话 ${conversation.title}`);
    deleteButton.title = "删除对话";
    deleteButton.dataset.conversationTitle = conversation.title;
    deleteButton.innerHTML = icon("trash-2");
    deleteButton.addEventListener("click", (event) => requestConversationDelete(event, conversation));

    row.append(button, deleteButton);
    elements.conversationList.appendChild(row);
  });
  refreshIcons();
}

async function loadConversations() {
  appState.conversations = await api("/api/conversations");
  renderConversations();
}

function setConversationSearchOpen(open, { clear = false } = {}) {
  if (clear) {
    appState.conversationQuery = "";
    elements.conversationSearchInput.value = "";
    renderConversations();
  }
  elements.conversationSearch.hidden = !open;
  elements.conversationSearchToggle.setAttribute("aria-expanded", String(open));
  if (open) window.requestAnimationFrame(() => elements.conversationSearchInput.focus());
}

function closeConversationDeleteDialog() {
  if (elements.conversationDeleteDialog.open) elements.conversationDeleteDialog.close();
}

function requestConversationDelete(event, conversation) {
  event.stopPropagation();
  if (conversation.is_demo) {
    showToast("演示数据，不支持删除");
    return;
  }
  appState.pendingConversationDelete = conversation;
  elements.conversationDeleteName.textContent = conversation.title;
  elements.conversationDeleteWarning.textContent = conversation.generation_status === "running"
    ? "该对话正在运行，删除后将同时停止对话，且无法恢复。"
    : "删除后无法恢复。";
  elements.conversationDeleteError.hidden = true;
  elements.conversationDeleteError.textContent = "";
  elements.conversationDeleteDialog.showModal();
  window.requestAnimationFrame(() => elements.conversationDeleteCancel.focus());
}

async function confirmConversationDelete() {
  const conversation = appState.pendingConversationDelete;
  if (!conversation) return;
  elements.conversationDeleteConfirm.disabled = true;
  elements.conversationDeleteCancel.disabled = true;
  elements.conversationDeleteClose.disabled = true;
  elements.conversationDeleteConfirm.textContent = "删除中...";
  elements.conversationDeleteError.hidden = true;
  try {
    await deleteConversation(conversation);
    closeConversationDeleteDialog();
  } catch (error) {
    elements.conversationDeleteError.textContent = error.message || "删除失败，请重试";
    elements.conversationDeleteError.hidden = false;
  } finally {
    elements.conversationDeleteConfirm.disabled = false;
    elements.conversationDeleteCancel.disabled = false;
    elements.conversationDeleteClose.disabled = false;
    elements.conversationDeleteConfirm.textContent = "确认删除";
  }
}

async function deleteConversation(conversation) {
  const deletingCurrent = appState.conversationId === conversation.id;
  if (deletingCurrent) disconnectStreamSubscription();
  try {
    await api(`/api/conversations/${encodeURIComponent(conversation.id)}`, { method: "DELETE" });
    if (deletingCurrent) {
      startNewChat();
    } else {
      await loadConversations();
    }
    showToast("对话已删除");
  } catch (error) {
    if (deletingCurrent && conversation.generation_status === "running") {
      await openConversation(conversation.id).catch(() => {});
    }
    throw error;
  }
}

function applyConversationSnapshot(conversation) {
  const switchingConversation = appState.conversationId !== conversation.id;
  if (switchingConversation) {
    resetMaterialInteractionState();
    appState.queuedMessages = [];
  }
  clearPendingAttachments();
  setAgentType(conversation.agent_type || "dw_agent", { reset: false });
  appState.conversationId = conversation.id;
  appState.isDemoConversation = Boolean(conversation.is_demo);
  appState.demoConversationInput = appState.isDemoConversation
    ? String(listFrom(conversation.messages).find((message) => message.role === "user")?.content || "").trim()
    : "";
  appState.activeTaskId = conversation.task_id || "";
  appState.activeTaskLabel = conversation.task_label || "";
  appState.intent = conversation.intent || "";
  appState.intentLabel = conversation.intent === "requirement"
    ? "数仓研发需求"
    : (conversation.intent_label || "");
  appState.requirementId = conversation.requirement_id || "";
  appState.workflowStatus = conversation.workflow_status || "";
  appState.workflowStage = conversation.workflow_stage || "";
  appState.workflowStageLabel = conversation.workflow_stage_label || "";
  appState.workflowPauseReason = conversation.workflow_pause_reason || "";
  appState.workflowResumeStage = conversation.workflow_resume_stage || "";
  appState.generationStatus = conversation.generation_status || "";
  appState.workflowEvents = listFrom(conversation.workflow_events);
  appState.requirementFiles = [];
  appState.reviewGates = conversation.review_gates || {};
  appState.messages = conversation.messages || [];
  Object.values(appState.reviewGates.stages || {}).forEach(reconcileMaterialGate);

  if (appState.generationStatus === "running") {
    const assistant = {
      id: `running-${conversation.id}`,
      role: "assistant",
      content: "",
      artifacts: [],
      activities: [],
      streaming: true,
      thinking: true,
      reasoningSummary: "",
      executionEvents: [],
      codexProgressItems: [],
      codexProgressSequence: 0,
    };
    hydrateWorkflowMessage(assistant, conversation, true);
    appState.messages.push(assistant);
  } else {
    const workflowAssistants = appState.messages.filter((message) => (
      message.role === "assistant" && message.route?.intent === "requirement"
    ));
    workflowAssistants.forEach((message) => hydrateWorkflowMessage(message, conversation));
  }
  window.DWAgentSkills?.setConversation(conversation);
}

function scrollToConversationAnchor(anchor) {
  if (anchor.startsWith("workflow-stage:")) {
    appState.workflowAnchorStage = anchor.slice("workflow-stage:".length);
    highlightWorkflowAnchor();
    return;
  }
  if (anchor === "workflow-summary") {
    appState.workflowAnchorStage = "";
    elements.workflowDrawer.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  if (anchor !== "requirement-input") return;
  const target = elements.messageList.querySelector('[data-conversation-anchor="requirement-input"]');
  if (!target) return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const containerBounds = elements.chatContent.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const targetTop = elements.chatContent.scrollTop + targetBounds.top - containerBounds.top - 24;
    elements.chatContent.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
    target.classList.add("is-anchor-target");
  }));
}

async function openConversation(conversationId, { anchor = "" } = {}) {
  disconnectStreamSubscription();
  closeArtifact();
  clearStageRerun();
  appState.workflowAnchorStage = "";
  try {
    const conversation = await api(`/api/conversations/${encodeURIComponent(conversationId)}`);
    applyConversationSnapshot(conversation);
    updateTaskContext();
    setView("chat");
    elements.viewTitle.textContent = conversation.title;
    elements.app.classList.remove("mobile-task-open");
    renderMessages();
    const requirementRecognized = appState.intent === "requirement"
      && appState.messages.some((message) => message.route?.intent === "requirement");
    if (requirementRecognized) {
      setWorkflowDrawer(true);
      loadReviewArtifacts(appState.requirementId).catch(() => {});
    } else {
      setWorkflowDrawer(false);
    }
    setStreaming(appState.generationStatus === "running");
    await loadConversations();
    if (appState.generationStatus === "running") {
      const assistant = appState.messages[appState.messages.length - 1];
      reconnectConversationStream(conversation.id, assistant);
    }
    scrollToConversationAnchor(anchor);
  } catch (error) {
    showToast(error.message);
  }
}

function startNewChat(task = null) {
  if (task && appState.agentType !== "dw_agent") {
    setAgentType("dw_agent", { reset: false });
  }
  disconnectStreamSubscription();
  closeArtifact();
  clearStageRerun();
  elements.app.classList.remove("mobile-task-open");
  appState.conversationId = "";
  window.DWAgentSkills?.clearForNewConversation();
  appState.isDemoConversation = false;
  appState.demoConversationInput = "";
  appState.activeTaskId = task?.id || "";
  appState.activeTaskLabel = task?.label || "";
  appState.intent = task ? "quick_task" : "";
  appState.intentLabel = task?.label || "";
  appState.requirementId = "";
  appState.workflowStatus = "";
  appState.workflowStage = "";
  appState.workflowStageLabel = "";
  appState.workflowPauseReason = "";
  appState.workflowResumeStage = "";
  appState.generationStatus = "";
  appState.queuedMessages = [];
  appState.workflowEvents = [];
  appState.requirementFiles = [];
  appState.reviewGates = {};
  resetMaterialInteractionState();
  clearPendingAttachments();
  setWorkflowDrawer(false);
  appState.messages = [];
  elements.viewTitle.textContent = "新对话";
  updateTaskContext();
  renderMessages();
  setView("chat");
  elements.chatInput.focus();
  renderConversations();
  loadConversations();
}

function renderAgents() {
  elements.agentList.innerHTML = AGENTS.map((agent) => {
    const enabled = Boolean(appState.enabledAgents[agent.id]);
    const current = appState.agentType === agent.id;
    return `
      <article class="skill-card agent-card${enabled ? "" : " is-disabled"}" data-agent-id="${agent.id}">
        <div class="skill-card-head">
          <span class="skill-card-icon">${icon(agent.icon)}</span>
          <div class="skill-card-copy">
            <strong>${escapeHtml(agent.name)}</strong>
            <p>${escapeHtml(agent.description)}</p>
          </div>
          <div class="skill-card-actions">
            <span class="skill-status ${enabled ? "published" : "pending"}">${enabled ? "已启用" : "已停用"}</span>
            <button class="skill-enabled-switch" type="button" role="switch" aria-checked="${enabled}" aria-label="${enabled ? "停用" : "启用"}${escapeHtml(agent.name)}" data-agent-toggle="${agent.id}"><span></span></button>
          </div>
        </div>
        <footer class="agent-card-footer">
          <span class="agent-current-status${current ? " is-current" : ""}">${current ? "当前用于新对话" : ""}</span>
          <button class="command-button agent-use-button${current ? " is-current" : ""}" type="button" data-agent-use="${agent.id}" ${enabled ? "" : "disabled"}>
            ${icon(current ? "check" : "message-square-plus")}<span>${current ? "当前使用" : "用于新对话"}</span>
          </button>
        </footer>
      </article>`;
  }).join("");
  refreshIcons();
}

function setAgentEnabled(agentType, enabled) {
  const agent = AGENTS.find((item) => item.id === agentType);
  if (!agent) return;
  const nextEnabled = Boolean(enabled);
  if (!nextEnabled && appState.enabledAgents[agentType]) {
    const enabledCount = AGENTS.filter((item) => appState.enabledAgents[item.id]).length;
    if (enabledCount <= 1) {
      showToast("至少需要启用一个 Agent", "warning");
      return;
    }
    if (agentType === appState.agentType && appState.generationStatus === "running") {
      showToast("请先停止当前生成，再停用该 Agent", "warning");
      return;
    }
  }
  appState.enabledAgents[agentType] = nextEnabled;
  if (!nextEnabled && agentType === appState.agentType) {
    const fallback = AGENTS.find((item) => appState.enabledAgents[item.id]);
    if (fallback) setAgentType(fallback.id);
  }
  persistAgentSettings();
  renderAgents();
}

function setAgentType(agentType, { reset = true } = {}) {
  const nextAgentType = agentType === "codex_agent" ? "codex_agent" : "dw_agent";
  const changed = appState.agentType !== nextAgentType;
  appState.agentType = nextAgentType;
  elements.chatInput.placeholder = nextAgentType === "codex_agent"
    ? "向 Dw Agent 提出问题"
    : "提出你的需求，DW Agent帮你解决";
  elements.emptyChatDescription.textContent = nextAgentType === "codex_agent"
    ? "向 Dw Agent 描述需要分析或处理的任务。"
    : "描述你的数仓开发需求，DW Agent 会协助完成需求评审、数仓调研、模型设计、数据开发和数据验证。";
  elements.modelPicker.hidden = nextAgentType === "codex_agent";
  elements.skillPicker.hidden = nextAgentType === "codex_agent";
  elements.composerDivider.hidden = nextAgentType === "codex_agent";
  persistAgentSettings();
  renderAgents();
  refreshIcons();
  if (changed && reset) startNewChat();
  else renderConversations();
}

async function startDemoConversation() {
  if (!appState.isDemoConversation || appState.generationStatus === "running") return;
  const input = appState.demoConversationInput;
  if (!input) {
    showToast("示例输入不存在");
    return;
  }
  elements.demoStart.disabled = true;
  try {
    resetCurrentConversationForRerun();
    await submitChatMessage(input, { rerunCurrent: true });
  } finally {
    elements.demoStart.disabled = false;
    syncDemoRerunVisibility();
  }
}

async function rerunDemoConversation() {
  if (!appState.isDemoConversation || appState.generationStatus === "running") return;
  elements.demoRerun.disabled = true;
  try {
    const conversation = await api(`/api/conversations/${encodeURIComponent(appState.conversationId)}/reset`, { method: "POST" });
    applyConversationSnapshot(conversation);
    updateTaskContext();
    setWorkflowDrawer(false);
    renderMessages();
    await loadConversations();
    syncDemoRerunVisibility();
    showToast("已恢复到执行前状态");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.demoRerun.disabled = false;
  }
}

function resetCurrentConversationForRerun() {
  disconnectStreamSubscription();
  closeArtifact();
  appState.activeTaskId = "";
  appState.activeTaskLabel = "";
  appState.intent = "";
  appState.intentLabel = "";
  appState.requirementId = "";
  appState.workflowStatus = "";
  appState.workflowStage = "";
  appState.workflowStageLabel = "";
  appState.workflowPauseReason = "";
  appState.workflowResumeStage = "";
  appState.generationStatus = "";
  appState.queuedMessages = [];
  appState.workflowEvents = [];
  appState.requirementFiles = [];
  appState.reviewGates = {};
  resetMaterialInteractionState();
  appState.messages = [];
  setWorkflowDrawer(false);
  updateTaskContext();
  renderMessages();
}

function setStreaming(active) {
  if (active) {
    elements.sendButton.classList.add("is-stop");
    elements.sendButton.setAttribute("aria-label", "停止生成");
    elements.sendButton.innerHTML = icon("square");
  } else {
    elements.sendButton.classList.remove("is-stop");
    elements.sendButton.setAttribute("aria-label", "发送");
    elements.sendButton.innerHTML = icon("arrow-up");
  }
  syncDemoRerunVisibility();
  syncComposerState();
  refreshIcons();
}

function syncComposerState() {
  const hasDraft = Boolean(elements.chatInput.value.trim()) || appState.pendingAttachments.length > 0;
  const previousMode = elements.sendButton.classList.contains("is-stop") ? "stop" : "send";
  let nextMode = "send";
  if (appState.generationStatus === "running" && hasDraft) {
    nextMode = "send";
    elements.sendButton.classList.remove("is-stop");
    elements.sendButton.setAttribute("aria-label", "排队发送");
    elements.sendButton.title = "当前任务完成后发送";
    elements.sendButton.innerHTML = icon("arrow-up");
  } else if (appState.generationStatus === "running") {
    nextMode = "stop";
    elements.sendButton.classList.add("is-stop");
    elements.sendButton.setAttribute("aria-label", "停止生成");
    elements.sendButton.title = "停止生成";
    elements.sendButton.innerHTML = icon("square");
  } else {
    elements.sendButton.title = "发送";
  }
  elements.sendButton.classList.toggle(
    "is-ready",
    appState.generationStatus === "running" || hasDraft,
  );
  if (previousMode !== nextMode) refreshIcons();
}

async function readEventStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let eventName = "message";
      const dataLines = [];
      block.split("\n").forEach((line) => {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      });
      if (dataLines.length) await onEvent(eventName, JSON.parse(dataLines.join("\n")));
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
}

function streamPresentationState(response, assistant) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const mockResponse = response.headers.get("X-AIDW-Mock") === "true" || Boolean(window.AIDW_PAGES_MOCK);
  return { active: Boolean(mockResponse && !reducedMotion && !assistant.inlineMaterialValidation), lastAt: 0 };
}

function streamEventGap(eventName, payload) {
  if (eventName === "activity") return 140;
  if (eventName === "route") return 180;
  if (eventName === "workflow") {
    if (payload?.status === "started") return 360;
    if (payload?.status === "running") return 620;
    return 420;
  }
  if (eventName === "complete") return 260;
  return 80;
}

async function waitForStreamPresentation(presentation, eventName, payload) {
  if (!presentation.active || !presentation.lastAt) return;
  const remaining = streamEventGap(eventName, payload) - (Date.now() - presentation.lastAt);
  if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
}

async function animateStreamText(assistant, property, text, controller, chunkSize = 1, append = false) {
  const units = [...String(text || "")];
  const prefix = append ? String(assistant[property] || "") : "";
  assistant[property] = prefix;
  for (let index = 0; index < units.length; index += chunkSize) {
    if (appState.abortController !== controller) return false;
    assistant[property] = prefix + units.slice(0, index + chunkSize).join("");
    renderMessages();
    if (index + chunkSize < units.length) {
      await new Promise((resolve) => window.setTimeout(resolve, STREAM_TEXT_STEP_MS));
    }
  }
  return true;
}

async function presentGenerationEvent(assistant, eventName, payload, controller, presentation) {
  await waitForStreamPresentation(presentation, eventName, payload);
  if (appState.abortController !== controller) return;
  const activityText = String(payload?.message || "");
  if (eventName === "activity" && /^(?:已识别为\s*数仓研发需求|开始解析输入内容)/.test(activityText)) {
    if (presentation.active) await animateStreamText(assistant, "streamingAnalysis", activityText, controller);
    else {
      assistant.streamingAnalysis = activityText;
      renderMessages();
    }
  } else if (eventName === "delta" && presentation.active && payload?.text) {
    assistant.thinking = false;
    await animateStreamText(assistant, "content", payload.text, controller, 3, true);
  } else {
    handleGenerationEvent(assistant, eventName, payload);
  }
  presentation.lastAt = Date.now();
}

function handleGenerationEvent(assistant, eventName, payload) {
  if (eventName === "conversation") {
    const isNewConversation = appState.conversationId !== payload.conversation_id;
    appState.conversationId = payload.conversation_id;
    appState.streamConversationId = payload.conversation_id;
    window.DWAgentSkills?.setConversationId(payload.conversation_id);
    if (isNewConversation) loadConversations().catch((error) => showToast(error.message));
  } else if (eventName === "activity") {
    appendActivity(assistant, payload.message);
    renderMessages();
  } else if (eventName === "reasoning_delta") {
    assistant.reasoningSummary += payload.text || "";
    renderMessages();
  } else if (eventName === "analysis_delta") {
    assistant.reasoningSummary += payload.text || "";
    appendCodexProgressText(assistant, payload.text || "");
    scheduleMessagesRender();
  } else if (eventName === "execution") {
    upsertCodexExecution(assistant, payload);
    renderMessages();
  } else if (eventName === "route") {
    assistant.route = payload;
    appState.intent = payload.intent || "conversation";
    appState.intentLabel = payload.label || (payload.intent === "conversation" ? "普通问答" : "");
    appState.requirementId = payload.requirement_id || appState.requirementId;
    if (payload.intent === "quick_task") {
      appState.activeTaskId = payload.task_id || "";
      appState.activeTaskLabel = payload.task_label || payload.label || "快速对话";
    } else {
      appState.activeTaskId = "";
      appState.activeTaskLabel = "";
    }
    if (payload.restart_stage) {
      appState.workflowStatus = "running";
      appState.workflowStage = payload.restart_stage;
      appState.workflowStageLabel = workflowStageBlueprint.find((stage) => stage.id === payload.restart_stage)?.label || "需求评审";
      appState.workflowPauseReason = "";
      appState.workflowResumeStage = payload.restart_stage;
      appState.requirementFiles = [];
    }
    if (payload.intent === "requirement") {
      const preserveWorkflowEvents = Boolean(payload.preserve_workflow_events);
      appState.workflowEvents = preserveWorkflowEvents
        ? appState.workflowEvents.filter((event) => event.type !== "result")
        : [];
      assistant.workflowStages = newWorkflowStages();
      assistant.workflowEvents = [];
      assistant.workflowMessage = preserveWorkflowEvents ? "正在继续需求流程" : "准备启动需求评审";
    }
    updateTaskContext();
    renderMessages();
    if (payload.intent === "requirement") setWorkflowDrawer(true);
  } else if (eventName === "workflow") {
    appState.workflowEvents.push(payload);
    if (!Array.isArray(assistant.workflowEvents)) assistant.workflowEvents = [];
    assistant.workflowEvents.push(payload);
    applyWorkflowEvent(assistant, payload);
    appState.intent = "requirement";
    appState.requirementId = payload.requirement_id || appState.requirementId;
    appState.workflowStatus = payload.status === "paused" || payload.status === "completed"
      ? payload.status
      : "running";
    appState.workflowStage = payload.stage || payload.current_stage || appState.workflowStage;
    appState.workflowStageLabel = payload.stage_label || payload.current_stage_label || appState.workflowStageLabel;
    if (payload.status === "paused") {
      appState.workflowPauseReason = payload.reason || "";
      appState.workflowResumeStage = isSolutionReviewConfirmationReason(payload.reason)
        ? ""
        : (payload.resume_stage || payload.current_stage || "");
    } else if (payload.status === "completed") {
      appState.workflowPauseReason = "";
      appState.workflowResumeStage = "";
    }
    updateTaskContext();
    renderMessages();
    if (
      ["requirement_review", "warehouse_research", "model_design", "data_development", "data_validation", "solution_review"].includes(payload.stage)
      && (payload.status === "completed" || (payload.completed_stages || []).includes(payload.stage))
    ) {
      loadReviewArtifacts(appState.requirementId).catch(() => {});
    }
  } else if (eventName === "review_gate") {
    if (payload?.status === "checking" && appState.pendingMaterialSubmission?.stage === payload.stage) {
      reconcileMaterialGate(payload);
      return;
    }
    if (!appState.reviewGates.stages) appState.reviewGates = { stages: {} };
    if (payload.stage) {
      reconcileMaterialGate(payload);
      appState.reviewGates.stages[payload.stage] = payload;
    }
    renderMessages();
  } else if (eventName === "delta") {
    assistant.thinking = false;
    assistant.content += payload.text || "";
    renderMessages();
  } else if (eventName === "complete") {
    const messageWorkflowEvents = listFrom(assistant.workflowEvents);
    Object.assign(assistant, payload.message, { streaming: false, thinking: false });
    assistant.workflowEvents = assistant.route?.intent === "requirement"
      ? messageWorkflowEvents
      : [];
    appState.generationStatus = "completed";
    assistant.presentationEntering = true;
    renderMessages();
    window.setTimeout(() => { assistant.presentationEntering = false; }, 360);
    loadReviewArtifacts(appState.requirementId).catch(() => {});
  } else if (eventName === "error") {
    appState.generationStatus = "failed";
    throw new Error(payload.message || "模型调用失败");
  }
}

let messagesRenderFrame = 0;

function scheduleMessagesRender() {
  if (messagesRenderFrame) return;
  messagesRenderFrame = window.requestAnimationFrame(() => {
    messagesRenderFrame = 0;
    renderMessages();
  });
}

async function refreshConversationSnapshot(conversationId) {
  const conversation = await api(`/api/conversations/${encodeURIComponent(conversationId)}`);
  if (appState.conversationId !== conversationId || appState.view !== "chat") return;
  applyConversationSnapshot(conversation);
  updateTaskContext();
  elements.viewTitle.textContent = conversation.title;
  renderMessages();
  setStreaming(appState.generationStatus === "running");
  await loadConversations();
}

let generationReconcilePending = false;

async function reconcileTerminalGeneration() {
  const conversationId = appState.conversationId;
  if (
    generationReconcilePending
    || appState.view !== "chat"
    || appState.generationStatus !== "running"
    || !conversationId
  ) return;

  generationReconcilePending = true;
  try {
    const conversation = await api(`/api/conversations/${encodeURIComponent(conversationId)}`);
    if (appState.conversationId !== conversationId || conversation.generation_status === "running") return;

    const controller = appState.abortController;
    appState.abortController = null;
    appState.streamConversationId = "";
    if (controller) controller.abort();
    applyConversationSnapshot(conversation);
    updateTaskContext();
    elements.viewTitle.textContent = conversation.title;
    renderMessages();
    setStreaming(false);
    loadReviewArtifacts(appState.requirementId).catch(() => {});
    await loadConversations();
  } catch (_error) {
    // The active stream remains authoritative while the status check is unavailable.
  } finally {
    generationReconcilePending = false;
  }
}

async function reconnectConversationStream(conversationId, assistant) {
  const controller = new AbortController();
  appState.abortController = controller;
  appState.streamConversationId = conversationId;
  setStreaming(true);

  try {
    const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/stream`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 409) {
        await refreshConversationSnapshot(conversationId);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `请求失败 (${response.status})`);
    }
    const presentation = streamPresentationState(response, assistant);
    await readEventStream(response, async (eventName, payload) => {
      if (appState.abortController !== controller || appState.conversationId !== conversationId) return;
      await presentGenerationEvent(assistant, eventName, payload, controller, presentation);
    });
    if (appState.abortController === controller) {
      await refreshConversationSnapshot(conversationId);
      await flushQueuedMessages();
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      showToast(error.message);
      if (appState.abortController === controller) await refreshConversationSnapshot(conversationId).catch(() => {});
    }
  } finally {
    if (appState.abortController === controller) {
      appState.abortController = null;
      appState.streamConversationId = "";
      setStreaming(appState.generationStatus === "running");
    }
  }
}

async function stopActiveGeneration() {
  const conversationId = appState.conversationId;
  const activeAssistant = [...appState.messages].reverse().find((message) => (
    message.role === "assistant"
    && (
      message.streaming
      || (message.workflowStages || []).some((stage) => !["waiting", "completed", "paused", "stopped"].includes(stage.status))
    )
  ));
  markMessageStopped(activeAssistant);
  renderMessages();
  disconnectStreamSubscription();
  if (!conversationId) return;

  try {
    const stopped = await api(`/api/conversations/${encodeURIComponent(conversationId)}/stop`, { method: "POST" });
    appState.generationStatus = "stopped";
    appState.workflowStatus = stopped.workflow_status || appState.workflowStatus;
    appState.workflowStage = stopped.workflow_stage || appState.workflowStage;
    appState.workflowStageLabel = stopped.workflow_stage_label || appState.workflowStageLabel;
    markMessageStopped(activeAssistant);
    renderMessages();
    setStreaming(false);
    await openConversation(conversationId);
  } catch (error) {
    showToast(error.message);
  }
}

async function submitChatMessage(content, {
  clearComposer = false,
  attachments = [],
  rerunCurrent = false,
  supplementItems = [],
  supplementStage = "",
  supplementStageLabel = "",
  restartStage = "",
  queuedMessageId = "",
} = {}) {
  content = String(content || "").trim();
  if (!content && !attachments.length) return;
  if (appState.generationStatus === "running") return;
  const normalizedSupplementItems = listFrom(supplementItems).map((item, index) => normalizeMissingMaterial(item, index));

  let attachmentPayloads = [];
  try {
    attachmentPayloads = await Promise.all(attachments.map(async (attachment) => ({
      name: attachment.name,
      mime_type: attachment.file.type || "application/octet-stream",
      content_base64: await fileAsBase64(attachment.file),
    })));
  } catch (error) {
    showToast(error.message);
    return;
  }

  const visibleContent = content || (normalizedSupplementItems.length ? "已上传补充材料。" : "请识别附件内容。");
  const requestContent = supplementRequestContent(content, normalizedSupplementItems);

  if (normalizedSupplementItems.length) {
    const stage = supplementStage || appState.supplementContext?.stage || "";
    const gate = appState.reviewGates?.stages?.[stage];
    materialProgressFor(stage, gate);
    appState.pendingMaterialSubmission = {
      stage,
      stageLabel: supplementStageLabel || appState.supplementContext?.stageLabel || gate?.stage_label || "当前阶段",
      items: normalizedSupplementItems,
      status: "submitted",
      previousGateStatus: gate?.status || "awaiting_materials",
    };
  }

  if (clearComposer) {
    if (restartStage) clearStageRerun({ restoreDraft: false });
    elements.chatInput.value = "";
    clearPendingAttachments();
    if (normalizedSupplementItems.length) clearSupplementContext();
    syncComposerState();
  }
  const userMessage = {
    id: queuedMessageId || `local-user-${Date.now()}`,
    role: "user",
    content: visibleContent,
    supplementItems: normalizedSupplementItems,
    artifacts: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mime_type: attachment.file.type || "application/octet-stream",
      size: attachment.file.size,
      kind: "attachment",
    })),
  };
  const queuedMessage = queuedMessageId
    ? appState.messages.find((message) => message.id === queuedMessageId)
    : null;
  if (queuedMessage) Object.assign(queuedMessage, userMessage, { queued: false });
  else appState.messages.push(userMessage);
  const assistant = {
    id: `local-assistant-${Date.now()}`,
    role: "assistant",
    content: "",
    artifacts: [],
    streaming: true,
    thinking: true,
    reasoningSummary: "",
    executionEvents: [],
    codexProgressItems: [],
    codexProgressSequence: 0,
    startedAt: Date.now(),
    inlineMaterialValidation: normalizedSupplementItems.length > 0,
  };
  appState.messages.push(assistant);
  const controller = new AbortController();
  appState.abortController = controller;
  appState.generationStatus = "running";
  renderMessages();
  setStreaming(true);

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AIDW-Account": appState.selectedAccount,
      },
      signal: controller.signal,
      body: JSON.stringify({
        message: requestContent,
        conversation_id: appState.conversationId,
        task_id: appState.activeTaskId,
        agent_type: appState.agentType,
        space_id: activeSpaceId,
        model: appState.selectedModel || null,
        attachments: attachmentPayloads,
        skill_bindings: window.DWAgentSkills?.getSelectedBindings?.() || [],
        skill_ids: window.DWAgentSkills?.getSelectedIds?.() || [],
        rerun: rerunCurrent,
        restart_stage: restartStage,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `请求失败 (${response.status})`);
    }
    const presentation = streamPresentationState(response, assistant);
    await readEventStream(response, async (eventName, payload) => {
      if (appState.abortController !== controller) return;
      await presentGenerationEvent(assistant, eventName, payload, controller, presentation);
    });
    assistant.streaming = false;
    assistant.thinking = false;
    renderMessages();
    await loadConversations();
    const activeButton = document.querySelector(`.conversation-button[data-id="${appState.conversationId}"] span`);
    if (activeButton) elements.viewTitle.textContent = activeButton.textContent;
    appState.generationStatus = "completed";
    await flushQueuedMessages();
  } catch (error) {
    assistant.streaming = false;
    assistant.thinking = false;
    if (error.name !== "AbortError" && appState.abortController === controller) {
      appState.generationStatus = "failed";
      assistant.content = `生成失败：${error.message}`;
      const pending = appState.pendingMaterialSubmission;
      const pendingGate = pending?.stage ? appState.reviewGates?.stages?.[pending.stage] : null;
      if (pendingGate?.status === "checking") pendingGate.status = pending.previousGateStatus;
      appState.pendingMaterialSubmission = null;
      showToast(error.message);
    }
    if (appState.abortController === controller) renderMessages();
  } finally {
    if (appState.abortController === controller) {
      appState.abortController = null;
      appState.streamConversationId = "";
      setStreaming(false);
    }
  }
}

function queueCurrentDraft() {
  const context = appState.supplementContext;
  const content = elements.chatInput.value.trim();
  const attachments = [...appState.pendingAttachments];
  if (!content && !attachments.length) return false;
  const draft = {
    content,
    attachments,
    supplementItems: listFrom(context?.items),
    supplementStage: context?.stage || "",
    supplementStageLabel: context?.stageLabel || "",
  };
  const signature = JSON.stringify({
    content: draft.content,
    attachments: draft.attachments.map((item) => item.id || item.name),
    supplementItems: draft.supplementItems,
    supplementStage: draft.supplementStage,
  });
  const previous = appState.queuedMessages[appState.queuedMessages.length - 1];
  if (!previous || previous.signature !== signature) {
    const queuedMessageId = `queued-user-${Date.now()}-${appState.queuedMessages.length}`;
    appState.queuedMessages.push({ ...draft, signature, queuedMessageId });
    const visibleContent = draft.content || (draft.supplementItems.length ? "已上传补充材料。" : "请识别附件内容。");
    appState.messages.push({
      id: queuedMessageId,
      role: "user",
      content: visibleContent,
      supplementItems: draft.supplementItems,
      queued: true,
      artifacts: draft.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        mime_type: attachment.file.type || "application/octet-stream",
        size: attachment.file.size,
        kind: "attachment",
      })),
    });
    elements.chatInput.value = "";
    clearPendingAttachments();
    if (draft.supplementItems.length) clearSupplementContext();
    renderMessages();
    showToast("输入已排队，将在当前任务完成后发送");
  } else {
    showToast("该输入已排队，将在任务完成后发送");
  }
  syncComposerState();
  return true;
}

async function flushQueuedMessages() {
  if (appState.generationStatus !== "completed" || !appState.queuedMessages.length) return;
  const next = appState.queuedMessages.shift();
  if (!next) return;
  await submitChatMessage(next.content, {
    clearComposer: true,
    attachments: next.attachments,
    supplementItems: next.supplementItems,
    supplementStage: next.supplementStage,
    supplementStageLabel: next.supplementStageLabel,
    queuedMessageId: next.queuedMessageId,
  });
  if (appState.generationStatus === "completed" && appState.queuedMessages.length) {
    await flushQueuedMessages();
  }
}

async function confirmStageReview(stage) {
  if (!stage || !appState.requirementId || appState.generationStatus === "running") return false;
  const gate = appState.reviewGates?.stages?.[stage];
  if (!gate || gate.status !== "awaiting_confirmation") return false;
  try {
    const result = await accountApi(
      `/api/requirements/${encodeURIComponent(appState.requirementId)}/review-gates/${encodeURIComponent(stage)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({ version: gate.version, artifact_hash: gate.artifact_hash }),
      },
    );
    if (!appState.reviewGates.stages) appState.reviewGates.stages = {};
    appState.reviewGates.stages[stage] = result.gate;
    renderMessages();
    if (result.resumed && result.conversation_id) {
      showToast("评审已通过，正在进入下一阶段");
      await openConversation(result.conversation_id);
    } else {
      showToast("当前版本已确认");
    }
    return true;
  } catch (error) {
    showToast(error.message);
    await loadReviewArtifacts(appState.requirementId).catch(() => {});
    return false;
  }
}

function clearStageRerun({ restoreDraft = true } = {}) {
  if (restoreDraft) elements.chatInput.value = appState.workflowRerunDraft;
  if (appState.workflowRerunPlaceholder) {
    elements.chatInput.placeholder = appState.workflowRerunPlaceholder;
  }
  appState.workflowRerunStage = "";
  appState.workflowRerunDraft = "";
  appState.workflowRerunPlaceholder = "";
  elements.workflowRerunContext.classList.add("is-hidden");
  syncComposerState();
}

async function startStageRerun(stage) {
  if (!stage || !appState.requirementId || appState.generationStatus === "running") return;
  try {
    const payload = await accountApi(
      `/api/requirements/${encodeURIComponent(appState.requirementId)}/review-gates/${encodeURIComponent(stage)}/input`,
    );
    clearSupplementContext();
    if (!appState.workflowRerunStage) {
      appState.workflowRerunDraft = elements.chatInput.value;
      appState.workflowRerunPlaceholder = elements.chatInput.placeholder;
    }
    appState.workflowRerunStage = stage;
    elements.workflowRerunContextLabel.textContent = `重跑 · ${payload.stage_label || "当前阶段"}`;
    elements.workflowRerunContext.classList.remove("is-hidden");
    elements.chatInput.placeholder = "修改阶段输入后发送，或直接发送原输入";
    elements.chatInput.value = String(payload.content || "").trim();
    syncComposerState();
    elements.chatInput.focus();
    elements.chatInput.setSelectionRange(elements.chatInput.value.length, elements.chatInput.value.length);
    elements.chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    showToast(error.message);
  }
}

async function sendMessage() {
  if (appState.generationStatus === "running") {
    if (queueCurrentDraft()) return;
    await stopActiveGeneration();
    return;
  }
  const context = appState.supplementContext;
  const restartStage = appState.workflowRerunStage;
  await submitChatMessage(elements.chatInput.value, {
    clearComposer: true,
    attachments: [...appState.pendingAttachments],
    supplementItems: listFrom(context?.items),
    supplementStage: context?.stage || "",
    supplementStageLabel: context?.stageLabel || "",
    restartStage,
  });
}

async function loadRequirements() {
  elements.requirementRefresh.disabled = true;
  elements.requirementRefresh.classList.add("is-loading");
  try {
    appState.requirements = await api("/api/requirements");
    populateRequirementFilterOptions();
    renderRequirements();
  } catch (error) {
    elements.requirementList.innerHTML = `<tr><td class="requirement-table-empty" colspan="7">${escapeHtml(error.message)}</td></tr>`;
  } finally {
    elements.requirementRefresh.disabled = false;
    elements.requirementRefresh.classList.remove("is-loading");
  }
}

function populateRequirementFilterOptions() {
  const selectedTypeChange = elements.requirementTypeChangeFilter.value;
  const selectedStage = elements.requirementStageFilter.value;
  const selectedCreator = elements.requirementCreatorFilter.value;
  const typeChanges = [...new Set(appState.requirements.flatMap((item) => (
    listFrom(item.type_change_labels).length
      ? item.type_change_labels
      : [item.type_change_label || "识别中"]
  )))].filter(Boolean).sort((left, right) => {
    if (left === "识别中") return 1;
    if (right === "识别中") return -1;
    return left.localeCompare(right, "zh-CN");
  });
  const availableStages = new Set(appState.requirements
    .map((item) => requirementStageLabel(item.current_stage))
    .filter(Boolean));
  const stages = requirementProgressStages.filter((stage) => availableStages.has(stage));
  const creators = [...new Set(appState.requirements.map((item) => item.created_by).filter(Boolean))].sort();
  elements.requirementTypeChangeFilter.innerHTML = '<option value="">全部</option>'
    + typeChanges.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  elements.requirementStageFilter.innerHTML = '<option value="">全部</option><option value="all_completed">全部完成</option>'
    + stages.map((stage) => `<option value="${escapeHtml(stage)}">${escapeHtml(stage)}</option>`).join("");
  elements.requirementCreatorFilter.innerHTML = '<option value="">全部</option>'
    + creators.map((creator) => `<option value="${escapeHtml(creator)}">${escapeHtml(creator)}</option>`).join("");
  elements.requirementTypeChangeFilter.value = typeChanges.includes(selectedTypeChange) ? selectedTypeChange : "";
  elements.requirementStageFilter.value = selectedStage === "all_completed" || stages.includes(selectedStage) ? selectedStage : "";
  elements.requirementCreatorFilter.value = creators.includes(selectedCreator) ? selectedCreator : "";
}

const requirementProgressStages = ["需求评审", "数仓调研", "模型设计", "数据开发", "数据验证", "方案审查"];

function requirementStageLabel(stage) {
  return stage === "需求准入评审" ? "需求评审" : stage;
}

function requirementAllStagesCompleted(requirement) {
  const completedStages = Number(requirement.stage_count || 0);
  const totalStages = Number(requirement.total_stages || requirementProgressStages.length);
  return requirement.status === "已完成" && completedStages >= totalStages;
}

function matchesRequirementStageFilter(requirement, stage) {
  if (!stage) return true;
  if (stage === "all_completed") return requirementAllStagesCompleted(requirement);
  if (requirementStageLabel(requirement.current_stage) !== stage) return false;
  return stage !== "方案审查" || !requirementAllStagesCompleted(requirement);
}

function updateRequirementCreatedAtSortControl() {
  const descending = appState.requirementCreatedAtSort === "desc";
  const description = descending ? "创建时间降序，点击切换为升序" : "创建时间升序，点击切换为降序";
  elements.requirementCreatedAtHeader.setAttribute("aria-sort", descending ? "descending" : "ascending");
  elements.requirementCreatedAtSort.innerHTML = icon(descending ? "arrow-down" : "arrow-up");
  elements.requirementCreatedAtSort.setAttribute("aria-label", description);
  elements.requirementCreatedAtSort.title = description;
}

function requirementProgress(requirement) {
  const currentStage = requirementStageLabel(requirement.current_stage);
  let currentIndex = requirementProgressStages.indexOf(currentStage);
  if (currentIndex < 0) {
    currentIndex = Math.max(0, Math.min(requirementProgressStages.length - 1, Number(requirement.stage_count || 1) - 1));
  }
  const status = String(requirement.status || "待开始");
  const steps = requirementProgressStages.map((stage, index) => {
    let state = "is-upcoming";
    let nodeIcon = "";
    if (status === "已完成" || index < currentIndex) {
      state = "is-completed";
      nodeIcon = icon(workflowProgressIcon("completed"));
    } else if (index === currentIndex) {
      if (status === "待开始") {
        state = "is-waiting";
      } else {
        state = "is-running";
        nodeIcon = icon(workflowProgressIcon("running"));
      }
    }
    const current = index === currentIndex;
    return `<span class="requirement-progress-step ${state}${current ? " is-current" : ""}">
      <span class="requirement-progress-node">${nodeIcon}</span>
      <span class="requirement-progress-label">${escapeHtml(stage)}</span>
    </span>`;
  }).join("");
  return `<div class="requirement-progress" aria-label="流程进度：${escapeHtml(currentStage)}，${escapeHtml(status)}">${steps}</div>`;
}

function filteredRequirements() {
  const name = elements.requirementNameFilter.value.trim().toLocaleLowerCase("zh-CN");
  const typeChange = elements.requirementTypeChangeFilter.value;
  const stage = elements.requirementStageFilter.value;
  const creator = elements.requirementCreatorFilter.value;
  const date = elements.requirementDateFilter.value;
  const requirements = appState.requirements.filter((requirement) => (
    (!name || [requirement.title, requirement.id, requirement.conversation_id].some((value) => (
      String(value || "").toLocaleLowerCase("zh-CN").includes(name)
    )))
    && (!typeChange || (listFrom(requirement.type_change_labels).length
      ? requirement.type_change_labels.includes(typeChange)
      : (requirement.type_change_label || "识别中") === typeChange))
    && matchesRequirementStageFilter(requirement, stage)
    && (!creator || requirement.created_by === creator)
    && (!date || String(requirement.created_at || "").slice(0, 10) === date)
  ));
  const direction = appState.requirementCreatedAtSort === "desc" ? -1 : 1;
  return requirements.sort((left, right) => direction * (
    (Date.parse(left.created_at || "") || 0) - (Date.parse(right.created_at || "") || 0)
  ));
}

function requirementConversationUrl(conversationId) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("conversation_id", conversationId);
  url.searchParams.set("anchor", "requirement-input");
  return url.toString();
}

function openRequirementConversation(conversationId) {
  if (!conversationId) return;
  window.open(requirementConversationUrl(conversationId), "_blank", "noopener");
}

function renderRequirementPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / appState.requirementPageSize));
  appState.requirementPage = Math.min(Math.max(1, appState.requirementPage), totalPages);
  const start = total ? (appState.requirementPage - 1) * appState.requirementPageSize + 1 : 0;
  const end = Math.min(total, appState.requirementPage * appState.requirementPageSize);
  elements.requirementPaginationSummary.textContent = total ? `共 ${total} 条，当前显示 ${start}-${end} 条` : "共 0 条";
  elements.requirementPageIndicator.textContent = `${appState.requirementPage} / ${totalPages}`;
  elements.requirementPageSize.value = String(appState.requirementPageSize);
  elements.requirementPagePrev.disabled = total === 0 || appState.requirementPage <= 1;
  elements.requirementPageNext.disabled = total === 0 || appState.requirementPage >= totalPages;
}

function renderRequirements() {
  const requirements = filteredRequirements();
  renderRequirementPagination(requirements.length);
  elements.requirementList.replaceChildren();
  if (!requirements.length) {
    collapseRequirementDetail();
    elements.requirementList.innerHTML = '<tr><td class="requirement-table-empty" colspan="7">暂无符合条件的需求</td></tr>';
    return;
  }
  const pageStart = (appState.requirementPage - 1) * appState.requirementPageSize;
  requirements.slice(pageStart, pageStart + appState.requirementPageSize).forEach((requirement) => {
    const row = document.createElement("tr");
    row.className = "requirement-table-row";
    row.dataset.requirementId = requirement.id;
    row.classList.toggle("is-active", appState.expandedRequirementId === requirement.id);
    row.innerHTML = `
      <td class="requirement-name-cell"><strong class="requirement-table-title">${escapeHtml(requirement.title)}</strong><span class="requirement-id">ID：${escapeHtml(requirement.id)}</span></td>
      <td><span class="requirement-conversation-id" title="${escapeHtml(requirement.conversation_id || "未关联会话")}">${escapeHtml(requirement.conversation_id || "-")}</span></td>
      <td><span class="requirement-type-change${requirement.type_change_label === "识别中" ? " is-recognizing" : ""}" title="${escapeHtml(requirement.type_change_label || "识别中")}">${escapeHtml(requirement.type_change_label || "识别中")}</span></td>
      <td class="requirement-progress-cell">${requirementProgress(requirement)}</td>
      <td><span class="requirement-creator">${escapeHtml(requirement.created_by || "-")}</span></td>
      <td><span class="requirement-created-at">${escapeHtml(formatAccountDate(requirement.created_at))}</span></td>
      <td><button class="requirement-conversation-link" type="button" aria-label="查看需求会话 ${escapeHtml(requirement.id)}" ${requirement.conversation_id ? "" : "disabled"}>查看会话</button></td>`;
    row.querySelector(".requirement-conversation-link").addEventListener("click", () => openRequirementConversation(requirement.conversation_id));
    elements.requirementList.appendChild(row);
  });
  refreshIcons();
}

function setExpandedRequirement(requirementId) {
  appState.expandedRequirementId = requirementId;
  document.querySelectorAll(".requirement-table-row").forEach((row) => {
    row.classList.toggle("is-active", row.dataset.requirementId === requirementId);
  });
}

function collapseRequirementDetail() {
  setExpandedRequirement("");
  elements.requirementDetail.replaceChildren();
  elements.requirementDetail.classList.add("is-hidden");
}

async function deleteRequirement(requirement) {
  const confirmed = window.confirm(
    `确认删除需求“${requirement.title}”吗？\n\n需求 ID：${requirement.id}\n删除后将移入可恢复区。`,
  );
  if (!confirmed) return;
  try {
    await api(`/api/requirements/${encodeURIComponent(requirement.id)}`, { method: "DELETE" });
    collapseRequirementDetail();
    closeArtifact();
    await loadRequirements();
    showToast("需求已删除，可从恢复区找回");
  } catch (error) {
    showToast(error.message);
  }
}

async function startRequirement(requirement) {
  try {
    const started = await api(`/api/requirements/${encodeURIComponent(requirement.id)}/start`, {
      method: "POST",
    });
    await loadRequirements();
    if (started.conversation_id) await openConversation(started.conversation_id);
    showToast("需求流程已开始");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadRequirementDetail(requirementId) {
  try {
    const requirement = await api(`/api/requirements/${encodeURIComponent(requirementId)}`);
    setExpandedRequirement(requirementId);
    elements.requirementDetail.replaceChildren();
    elements.requirementDetail.classList.remove("is-hidden");

    const head = document.createElement("div");
    head.className = "requirement-detail-head";
    const copy = document.createElement("div");
    copy.className = "requirement-detail-copy";
    const title = document.createElement("strong");
    title.textContent = requirement.title;
    const meta = document.createElement("small");
    meta.className = "muted";
    meta.textContent = `${requirement.id} · ${requirement.current_stage}`;
    copy.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "requirement-detail-actions";
    if (requirement.conversation_id) {
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "command-button primary";
      openButton.setAttribute("aria-label", `打开需求对话 ${requirement.id}`);
      openButton.innerHTML = `${icon("message-square")}<span>打开对话</span>`;
      openButton.addEventListener("click", () => openConversation(requirement.conversation_id));
      actions.appendChild(openButton);
    } else if (!requirement.stage_count) {
      const startButton = document.createElement("button");
      startButton.type = "button";
      startButton.className = "command-button primary";
      startButton.setAttribute("aria-label", `开始处理需求 ${requirement.id}`);
      startButton.innerHTML = `${icon("play")}<span>开始处理</span>`;
      startButton.addEventListener("click", () => startRequirement(requirement));
      actions.appendChild(startButton);
    }
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "command-button danger";
    deleteButton.setAttribute("aria-label", `删除需求 ${requirement.id}`);
    deleteButton.innerHTML = `${icon("trash-2")}<span>删除需求</span>`;
    deleteButton.addEventListener("click", () => deleteRequirement(requirement));
    actions.appendChild(deleteButton);
    head.append(copy, actions);
    elements.requirementDetail.appendChild(head);

    const files = document.createElement("div");
    files.className = "requirement-files";
    const reviewFiles = (requirement.files || []).filter((file) => /requirement_review_report/.test(file.name || ""));
    reviewFiles.forEach((file) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "requirement-file";
      button.innerHTML = `${icon("file-text")}<span>需求评审报告.doc</span><small class="muted">${formatBytes(file.size)}</small>`;
      button.addEventListener("click", () => openArtifact(file));
      files.appendChild(button);
    });
    if (!reviewFiles.length) files.innerHTML = '<div class="empty-row">暂无需求评审产物</div>';
    elements.requirementDetail.appendChild(files);
    elements.requirementDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    refreshIcons();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadTasks() {
  try {
    const tasks = await api("/api/quick-tasks");
    appState.quickTasks = tasks.map((task) => ({
      ...task,
      icon: taskIcons[task.id] || "blocks",
    }));
    renderTaskTypeButton();
    elements.taskList.replaceChildren();
    appState.quickTasks.forEach((task) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "task-card";
      button.innerHTML = `<span class="task-icon">${icon(taskIcons[task.id] || "blocks")}</span><span class="task-copy"><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.description)}</small></span>${icon("arrow-up-right")}`;
      button.addEventListener("click", () => startNewChat(task));
      elements.taskList.appendChild(button);
    });
    refreshIcons();
  } catch (error) {
    elements.taskList.innerHTML = `<div class="empty-row">${escapeHtml(error.message)}</div>`;
  }
}

async function loadKnowledge() {
  try {
    const [items, categories] = await Promise.all([
      api("/api/knowledge"),
      api("/api/knowledge/categories").catch(() => []),
    ]);
    appState.knowledgeItems = items
      .map((item) => {
        const group = knowledgeCategoryGroup(item);
        return {
          ...item,
          ...(phaseOneKnowledgeDisplayOverrides[item.id] || {}),
          category_group: group.id,
          category_group_label: item.category_group_label || group.label,
          runtime_bound: false,
          type_label: phaseOneKnowledgeTypeLabels[item.id] || item.type_label,
        };
      });
    appState.knowledgeCategories = Array.isArray(categories) ? categories : [];
    renderKnowledgeCategories();
    renderKnowledgeDocuments();
  } catch (error) {
    elements.knowledgeList.innerHTML = `<div class="empty-row">${escapeHtml(error.message)}</div>`;
  }
}

function knowledgeCategories() {
  const categories = new Map(
    appState.knowledgeCategories
      .filter((category) => !category.builtin || appState.knowledgeItems.some((item) => item.category === category.id))
      .map((category) => [category.id, {
        ...category,
        count: 0,
        order: Number(category.order || 100),
      }]),
  );
  appState.knowledgeItems.forEach((item) => {
    if (!categories.has(item.category)) {
      categories.set(item.category, {
        id: item.category,
        label: item.category_label || "其他知识",
        description: item.category_description || "知识内容",
        order: Number(item.category_order || 100),
        count: 0,
      });
    }
    categories.get(item.category).count += 1;
  });
  return [...categories.values()].sort((left, right) => left.order - right.order);
}

function renderKnowledgeCategories() {
  const categories = knowledgeCategories();
  if (appState.knowledgeCategory !== "all" && !categories.some((item) => item.id === appState.knowledgeCategory)) {
    appState.knowledgeCategory = "all";
  }
  elements.knowledgeDocumentTotal.textContent = `${appState.knowledgeItems.length} 项`;
  elements.knowledgeCategoryNav.innerHTML = [
    { id: "all", label: "全部知识", count: appState.knowledgeItems.length, icon: "layout-list" },
    ...categories.map((item) => ({ ...item, icon: item.id === "workflow_prompts" ? "messages-square" : item.id === "warehouse_standards" ? "blocks" : item.id === "platform_configuration" ? "settings" : "book-open" })),
  ].map((item) => `<button type="button" class="knowledge-category-button ${item.id === appState.knowledgeCategory ? "is-active" : ""}" data-knowledge-category="${escapeHtml(item.id)}">${icon(item.icon)}<span>${escapeHtml(item.label)}</span><small>${item.count}</small></button>`).join("");
  refreshIcons();
}

function renderKnowledgeDocuments() {
  const query = elements.knowledgeSearch.value.trim().toLowerCase();
  const categories = knowledgeCategories();
  const selectedCategory = categories.find((item) => item.id === appState.knowledgeCategory);
  elements.knowledgeSectionTitle.textContent = selectedCategory?.label || "全部知识";
  elements.knowledgeSectionDescription.textContent = selectedCategory?.description || "按类别浏览和维护知识内容";
  elements.knowledgeCategoryActions.hidden = !selectedCategory;

  const filteredItems = appState.knowledgeItems.filter((item) => {
    if (appState.knowledgeCategory !== "all" && item.category !== appState.knowledgeCategory) return false;
    if (!query) return true;
    return [item.title, item.description, item.filename, item.type_label, item.category_label, item.category_group_label, knowledgeSearchAliases[item.id]]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
  elements.knowledgeList.replaceChildren();
  const groups = new Map();
  filteredItems.forEach((item) => {
      const key = item.category || "business_knowledge";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
  });
  if (!filteredItems.length) {
    const emptyCategory = selectedCategory && !query;
    elements.knowledgeList.innerHTML = `<div class="knowledge-empty"><i data-lucide="${emptyCategory ? "folder-open" : "search-x"}"></i><strong>${emptyCategory ? "该分类暂无知识" : "没有匹配的知识"}</strong><small>${emptyCategory ? "可以保留空分类，后续再添加知识" : "调整关键词或切换知识分类"}</small></div>`;
    refreshIcons();
    return;
  }
    [...groups.values()]
      .sort((left, right) => Number(left[0]?.category_order || 100) - Number(right[0]?.category_order || 100))
      .forEach((groupItems) => {
      groupItems.sort((left, right) => Number(left.item_order || 100) - Number(right.item_order || 100));
      const first = groupItems[0] || {};
      const section = document.createElement("section");
      section.className = "knowledge-group";
      const header = document.createElement("header");
      header.className = "knowledge-group-head";
      header.innerHTML = `<strong>${escapeHtml(first.category_label || "其他知识")}</strong><small>${groupItems.length} 项</small>`;
      const grid = document.createElement("div");
      grid.className = "knowledge-group-grid";
      groupItems.forEach((item) => {
        const operationalState = knowledgeOperationalState(item);
        const row = document.createElement("button");
        row.type = "button";
        row.className = `knowledge-row${operationalState ? " has-meta" : ""}`;
        row.innerHTML = `
          <span class="knowledge-row-icon">${icon(knowledgeIcons[item.id] || "file-text")}</span>
          <span class="knowledge-row-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.description || "知识内容")}</small>
          </span>
          ${operationalState ? `<span class="knowledge-row-meta"><small class="knowledge-row-state">${escapeHtml(operationalState)}</small></span>` : ""}${icon("chevron-right")}`;
        row.addEventListener("click", () => {
          if (typeof window.openKnowledgeHubItem === "function" && window.openKnowledgeHubItem(item)) return;
          openKnowledgeDocument(item.id);
        });
        grid.appendChild(row);
      });
      if (appState.knowledgeCategory === "all") section.appendChild(header);
      section.appendChild(grid);
      elements.knowledgeList.appendChild(section);
    });
    refreshIcons();
}

function openKnowledgeCategoryForm(categoryId = "") {
  if (!categoryId && currentAccountUser?.role !== "admin") {
    showToast("请联系管理员");
    return;
  }
  const category = knowledgeCategories().find((item) => item.id === categoryId) || null;
  editingKnowledgeCategory = category;
  elements.knowledgeCategoryFormTitle.textContent = category ? "编辑分类" : "新增分类";
  elements.knowledgeCategoryName.value = category?.label || "";
  elements.knowledgeCategoryFormError.textContent = "";
  elements.knowledgeCategoryFormError.hidden = true;
  elements.knowledgeCategoryFormDialog.showModal();
  window.setTimeout(() => elements.knowledgeCategoryName.focus(), 0);
  refreshIcons();
}

function closeKnowledgeCategoryForm() {
  editingKnowledgeCategory = null;
  elements.knowledgeCategoryFormDialog.close();
}

async function saveKnowledgeCategory(event) {
  event.preventDefault();
  const label = elements.knowledgeCategoryName.value.trim();
  if (!label) {
    elements.knowledgeCategoryFormError.textContent = "请输入分类名称";
    elements.knowledgeCategoryFormError.hidden = false;
    elements.knowledgeCategoryName.focus();
    return;
  }
  try {
    const editingId = editingKnowledgeCategory?.id || "";
    const saved = await accountApi(editingId ? `/api/knowledge/categories/${encodeURIComponent(editingId)}` : "/api/knowledge/categories", {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify({ label }),
    });
    closeKnowledgeCategoryForm();
    appState.knowledgeCategory = saved.id;
    await loadKnowledge();
    showToast(editingId ? "知识分类已更新" : "知识分类已创建");
  } catch (error) {
    elements.knowledgeCategoryFormError.textContent = error.message || "保存失败";
    elements.knowledgeCategoryFormError.hidden = false;
  }
}

function openKnowledgeCategoryDelete() {
  if (currentAccountUser?.role !== "admin") {
    showToast("请联系管理员");
    return;
  }
  const category = knowledgeCategories().find((item) => item.id === appState.knowledgeCategory);
  if (!category) return;
  deletingKnowledgeCategory = category;
  elements.knowledgeCategoryDeleteName.textContent = category.label;
  elements.knowledgeCategoryDeleteCount.textContent = String(category.count);
  elements.knowledgeCategoryDeleteError.textContent = "";
  elements.knowledgeCategoryDeleteError.hidden = true;
  elements.knowledgeCategoryDeleteDialog.showModal();
  window.setTimeout(() => elements.knowledgeCategoryDeleteCancel.focus(), 0);
  refreshIcons();
}

function closeKnowledgeCategoryDelete() {
  deletingKnowledgeCategory = null;
  elements.knowledgeCategoryDeleteDialog.close();
}

async function deleteKnowledgeCategory() {
  if (!deletingKnowledgeCategory) return;
  elements.knowledgeCategoryDeleteConfirm.disabled = true;
  try {
    await accountApi(`/api/knowledge/categories/${encodeURIComponent(deletingKnowledgeCategory.id)}`, { method: "DELETE" });
    appState.knowledgeCategory = "all";
    closeKnowledgeCategoryDelete();
    await loadKnowledge();
    showToast("知识分类已删除");
  } catch (error) {
    elements.knowledgeCategoryDeleteError.textContent = error.message || "删除失败";
    elements.knowledgeCategoryDeleteError.hidden = false;
  } finally {
    elements.knowledgeCategoryDeleteConfirm.disabled = false;
  }
}

function openKnowledgeCreateDialog() {
  const categories = knowledgeCategories();
  elements.knowledgeCreateForm.reset();
  setKnowledgeMarkdownFiles();
  elements.knowledgeCreateCategory.innerHTML = [
    '<option value="">请选择所属分类</option>',
    ...categories.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`),
  ].join("");
  if (appState.knowledgeCategory !== "all" && categories.some((item) => item.id === appState.knowledgeCategory)) {
    elements.knowledgeCreateCategory.value = appState.knowledgeCategory;
  }
  elements.knowledgeCreateError.textContent = "";
  elements.knowledgeCreateSubmit.disabled = false;
  elements.knowledgeCreateDialog.showModal();
  elements.knowledgeCreateTitle.focus();
  refreshIcons();
}

function closeKnowledgeCreateDialog() {
  elements.knowledgeCreateDialog.close();
  elements.knowledgeCreateError.textContent = "";
  setKnowledgeMarkdownFiles();
}

function knowledgeCreateOrganizationType() {
  return elements.knowledgeCreateForm.querySelector('input[name="organization_type"]:checked')?.value || "single_page";
}

function setKnowledgeMarkdownFiles(files = []) {
  selectedKnowledgeMarkdownFiles = [...files];
  const directoryMode = knowledgeCreateOrganizationType() === "directory";
  elements.knowledgeCreateFile.value = "";
  elements.knowledgeCreateFile.multiple = directoryMode;
  elements.knowledgeCreateFileName.textContent = selectedKnowledgeMarkdownFiles.length
    ? (selectedKnowledgeMarkdownFiles.length === 1 ? selectedKnowledgeMarkdownFiles[0].name : `已选择 ${selectedKnowledgeMarkdownFiles.length} 个文件`)
    : (directoryMode ? "目录型文档支持多个文件，最多 50 个" : "单篇文档最多 1 个文件");
  elements.knowledgeCreateFileName.title = selectedKnowledgeMarkdownFiles.map((file) => file.name).join("\n");
  elements.knowledgeCreateFileClear.hidden = selectedKnowledgeMarkdownFiles.length === 0;
  elements.knowledgeCreateDropzone.classList.toggle("is-selected", selectedKnowledgeMarkdownFiles.length > 0);
}

function selectKnowledgeMarkdownFiles(files) {
  const selected = [...(files || [])];
  const directoryMode = knowledgeCreateOrganizationType() === "directory";
  if (!selected.length) return;
  if (!directoryMode && selected.length > 1) {
    elements.knowledgeCreateError.textContent = "单篇文档最多支持 1 个文件";
    setKnowledgeMarkdownFiles();
    return;
  }
  if (selected.length > MAX_KNOWLEDGE_MARKDOWN_FILES) {
    elements.knowledgeCreateError.textContent = `目录型文档最多支持 ${MAX_KNOWLEDGE_MARKDOWN_FILES} 个文件`;
    setKnowledgeMarkdownFiles();
    return;
  }
  const invalid = selected.find((file) => !["md", "markdown"].includes(String(file.name || "").split(".").pop().toLowerCase()));
  if (invalid) {
    elements.knowledgeCreateError.textContent = "请选择 .md 或 .markdown 文件";
    setKnowledgeMarkdownFiles();
    return;
  }
  if (selected.some((file) => file.size > MAX_KNOWLEDGE_MARKDOWN_BYTES)) {
    elements.knowledgeCreateError.textContent = "单个 Markdown 文件不能超过 1 MB";
    setKnowledgeMarkdownFiles();
    return;
  }
  if (selected.reduce((total, file) => total + file.size, 0) > MAX_KNOWLEDGE_MARKDOWN_BYTES) {
    elements.knowledgeCreateError.textContent = "Markdown 文件总大小不能超过 1 MB";
    setKnowledgeMarkdownFiles();
    return;
  }
  elements.knowledgeCreateError.textContent = "";
  setKnowledgeMarkdownFiles(selected);
}

async function submitKnowledgeCreate(event) {
  event.preventDefault();
  const title = elements.knowledgeCreateTitle.value.trim();
  const description = elements.knowledgeCreateDescription.value.trim();
  const category = elements.knowledgeCreateCategory.value;
  const organizationType = knowledgeCreateOrganizationType();
  if (!title) {
    elements.knowledgeCreateError.textContent = "请输入知识名称";
    elements.knowledgeCreateTitle.focus();
    return;
  }
  if (!category) {
    elements.knowledgeCreateError.textContent = "请选择所属分类";
    elements.knowledgeCreateCategory.focus();
    return;
  }
  elements.knowledgeCreateError.textContent = "";
  elements.knowledgeCreateSubmit.disabled = true;
  try {
    const importedFiles = await Promise.all(selectedKnowledgeMarkdownFiles.map(async (file) => ({
      name: file.name,
      content: (await file.text()).replace(/^\uFEFF/, ""),
    })));
    const initialContent = importedFiles.length > 1
      ? importedFiles.map((file) => `## ${file.name.replace(/\.(?:md|markdown)$/i, "")}\n\n${file.content}`).join("\n\n---\n\n")
      : (importedFiles[0]?.content || "");
    const created = await accountApi("/api/knowledge", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        category,
        organization_type: organizationType,
        initial_content: initialContent,
        source_filename: importedFiles.length === 1 ? importedFiles[0].name : (importedFiles.length ? `${importedFiles.length} 个本地文件` : ""),
        source_filenames: importedFiles.map((file) => file.name),
      }),
    });
    closeKnowledgeCreateDialog();
    appState.knowledgeCategory = category;
    await loadKnowledge();
    await openKnowledgeDocument(created.id);
    setKnowledgeEditorSingleMode("edit", { focus: true });
    showToast("知识已创建，请补充内容");
  } catch (error) {
    elements.knowledgeCreateError.textContent = error.message;
    elements.knowledgeCreateSubmit.disabled = false;
  }
}

function setConfigKnowledgeMode(mode) {
  if (mode === appState.configKnowledgeMode) {
    if (mode === "library" && typeof loadLibraryBases === "function") loadLibraryBases();
    return;
  }
  if (appState.knowledgeDirty && !window.confirm("当前文档有未保存的修改，确定切换吗？")) return;
  appState.configKnowledgeMode = mode;
  if (mode === "library") {
    appState.currentKnowledge = null;
    appState.knowledgeDirty = false;
    elements.knowledgeEditor.classList.add("is-hidden");
    elements.knowledgeBrowser.classList.add("is-hidden");
    elements.libraryKnowledgePanel.classList.remove("is-hidden");
    if (typeof loadLibraryBases === "function") loadLibraryBases();
  } else {
    elements.libraryKnowledgePanel.classList.add("is-hidden");
    elements.knowledgeEditor.classList.add("is-hidden");
    elements.knowledgeBrowser.classList.remove("is-hidden");
    loadKnowledge();
  }
  document.querySelectorAll("[data-config-knowledge-mode]").forEach((button) => {
    const active = button.dataset.configKnowledgeMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  refreshIcons();
}

function setKnowledgeEditorVisible(visible) {
  elements.knowledgeBrowser.classList.toggle("is-hidden", visible);
  elements.knowledgeEditor.classList.toggle("is-hidden", !visible);
  elements.libraryKnowledgePanel.classList.add("is-hidden");
  document.querySelectorAll(".knowledge-hub-panel").forEach((panel) => panel.classList.add("is-hidden"));
}

function setKnowledgeDirty(dirty) {
  appState.knowledgeDirty = dirty;
  elements.knowledgeSave.disabled = !dirty;
  if (dirty) elements.knowledgeEditorStatus.textContent = "未保存";
}

function renderKnowledgePreview() {
  elements.knowledgeEditorPreview.innerHTML = renderMarkdown(elements.knowledgeEditorInput.value);
}

function applyKnowledgeDocumentEditorPresentation({ root, sourcePane, previewPane, modeButtons, splitButton, mode, layout }) {
  const split = layout === "split";
  const editing = mode === "edit";
  root.classList.toggle("is-split-pane", split);
  sourcePane.hidden = !editing && !split;
  previewPane.hidden = editing && !split;
  modeButtons.forEach((button) => {
    const active = !split && button.dataset.knowledgeEditorSingleMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  splitButton.classList.toggle("is-active", split);
  splitButton.setAttribute("aria-pressed", String(split));
}

function renderKnowledgeEditorPresentation({ focus = false } = {}) {
  if (!elements.knowledgeEditor.classList.contains("is-single-pane")) return;
  const editing = appState.knowledgeEditorSingleMode === "edit";
  applyKnowledgeDocumentEditorPresentation({
    root: elements.knowledgeEditor,
    sourcePane: elements.knowledgeEditorSourcePane,
    previewPane: elements.knowledgeEditorPreviewPane,
    modeButtons: elements.knowledgeEditorSingleModeButtons,
    splitButton: elements.knowledgeEditorSplit,
    mode: appState.knowledgeEditorSingleMode,
    layout: appState.knowledgeEditorLayout,
  });
  if (!editing) renderKnowledgePreview();
  if ((editing || appState.knowledgeEditorLayout === "split") && focus) elements.knowledgeEditorInput.focus({ preventScroll: true });
}

function setKnowledgeEditorSingleMode(mode, { focus = false } = {}) {
  appState.knowledgeEditorLayout = "single";
  appState.knowledgeEditorSingleMode = mode === "edit" ? "edit" : "preview";
  renderKnowledgeEditorPresentation({ focus });
}

function toggleKnowledgeEditorSplit({ focus = false } = {}) {
  appState.knowledgeEditorLayout = appState.knowledgeEditorLayout === "split" ? "single" : "split";
  renderKnowledgeEditorPresentation({ focus: focus && appState.knowledgeEditorLayout === "split" });
}

function configureKnowledgeEditorPresentation(documentId) {
  const documentTemplate = isKnowledgeDocumentTemplate(documentId);
  elements.knowledgeEditor.classList.toggle("is-single-pane", documentTemplate);
  elements.knowledgeEditor.classList.remove("is-split-pane");
  elements.knowledgeDownload.hidden = !documentId;
  elements.knowledgeEditorEdit.hidden = !documentTemplate;
  elements.knowledgeEditorModebar.hidden = !documentTemplate;
  elements.knowledgeHistoryOpen.hidden = !documentTemplate;
  elements.knowledgeEditorDelete.hidden = !documentTemplate;
  elements.knowledgeSave.querySelector("span").textContent = "保存";
  elements.knowledgeEditorSourcePane.hidden = false;
  elements.knowledgeEditorPreviewPane.hidden = false;
  if (documentTemplate) setKnowledgeEditorSingleMode("preview");
  else closeKnowledgeRevisionDrawer();
}

function knowledgeRevisionOperationLabel(operation) {
  if (operation === "restore") return "恢复";
  if (operation === "initial") return "初始";
  return "保存";
}

function knowledgeLineDiff(previousContent, currentContent) {
  const previous = String(previousContent || "").split("\n");
  const current = String(currentContent || "").split("\n");
  if (previous.join("\n") === current.join("\n")) return [];
  if (previous.length * current.length > 250000) {
    return [
      ...previous.map((line) => ({ type: "remove", text: line })),
      ...current.map((line) => ({ type: "add", text: line })),
    ];
  }
  const matrix = Array.from({ length: previous.length + 1 }, () => new Uint32Array(current.length + 1));
  for (let left = previous.length - 1; left >= 0; left -= 1) {
    for (let right = current.length - 1; right >= 0; right -= 1) {
      matrix[left][right] = previous[left] === current[right]
        ? matrix[left + 1][right + 1] + 1
        : Math.max(matrix[left + 1][right], matrix[left][right + 1]);
    }
  }
  const diff = [];
  let left = 0;
  let right = 0;
  while (left < previous.length && right < current.length) {
    if (previous[left] === current[right]) {
      diff.push({ type: "same", text: previous[left] });
      left += 1;
      right += 1;
    } else if (matrix[left + 1][right] >= matrix[left][right + 1]) {
      diff.push({ type: "remove", text: previous[left] });
      left += 1;
    } else {
      diff.push({ type: "add", text: current[right] });
      right += 1;
    }
  }
  while (left < previous.length) diff.push({ type: "remove", text: previous[left++] });
  while (right < current.length) diff.push({ type: "add", text: current[right++] });
  return diff;
}

function renderKnowledgeRevisionList() {
  elements.knowledgeRevisionList.innerHTML = appState.knowledgeRevisions.map((revision) => `
    <button class="knowledge-revision-item ${revision.revision_id === appState.selectedKnowledgeRevision?.revision_id ? "is-active" : ""}" type="button" data-knowledge-revision="${escapeHtml(revision.revision_id)}">
      <strong>${escapeHtml(revision.revision_id)}</strong><span>${revision.is_current ? "当前" : knowledgeRevisionOperationLabel(revision.operation)}</span>
      <small>${escapeHtml(revision.summary || "未填写修改说明")}</small>
      <small>${escapeHtml(revision.actor || "system")} · ${escapeHtml(formatAccountDate(revision.created_at))}</small>
    </button>`).join("");
}

function renderKnowledgeRevisionDetail() {
  const revision = appState.selectedKnowledgeRevision;
  if (!revision) {
    elements.knowledgeRevisionDetail.innerHTML = '<div class="empty-row">选择一个版本查看内容</div>';
    return;
  }
  const contentMode = appState.knowledgeRevisionDetailMode === "content";
  const revisionContext = appState.knowledgeRevisionContext;
  const currentContent = revisionContext?.currentContent?.() ?? elements.knowledgeEditorInput.value;
  const hasUnsavedChanges = Boolean(revisionContext?.hasUnsavedChanges?.());
  const currentRevision = appState.knowledgeRevisions.find((item) => item.is_current);
  const comparisonTarget = hasUnsavedChanges
    ? "当前编辑内容（未保存）"
    : currentRevision?.revision_id
      ? `当前版本（${currentRevision.revision_id}）`
      : "当前内容";
  const comparisonTabLabel = hasUnsavedChanges ? "与未保存内容对比" : "与当前版本对比";
  const diff = knowledgeLineDiff(revision.content, currentContent);
  const diffHtml = diff.length
    ? `<div class="knowledge-revision-diff">${diff.map((line) => `<div class="knowledge-revision-diff-line is-${line.type}"><span>${line.type === "add" ? "+" : line.type === "remove" ? "-" : ""}</span><span>${escapeHtml(line.text || " ")}</span></div>`).join("")}</div>`
    : `<div class="knowledge-revision-diff knowledge-revision-diff-empty">该版本与${escapeHtml(comparisonTarget)}一致</div>`;
  const revisionAction = revision.is_current
    ? `<span class="knowledge-revision-current">${icon("check")}<span>当前版本</span></span>`
    : `<button class="command-button" type="button" data-knowledge-revision-restore>${icon("rotate-ccw")}<span>恢复此版本</span></button>`;
  elements.knowledgeRevisionDetail.innerHTML = `
    <header class="knowledge-revision-detail-head"><div><strong>${escapeHtml(revision.revision_id)} · ${escapeHtml(revision.summary || "版本记录")}</strong><small>${escapeHtml(revision.actor || "system")} · ${escapeHtml(formatAccountDate(revision.created_at))}</small></div>${revisionAction}</header>
    <div class="knowledge-revision-meta"><span>操作：${escapeHtml(knowledgeRevisionOperationLabel(revision.operation))}</span>${revision.restored_from ? `<span>来源：${escapeHtml(revision.restored_from)}</span>` : ""}</div>
    <div class="knowledge-revision-detail-tabs" role="group" aria-label="版本查看方式"><button class="${contentMode ? "" : "is-active"}" type="button" data-knowledge-revision-mode="diff">${comparisonTabLabel}</button><button class="${contentMode ? "is-active" : ""}" type="button" data-knowledge-revision-mode="content">版本内容</button></div>
    ${contentMode ? `<pre class="knowledge-revision-content">${escapeHtml(revision.content)}</pre>` : diffHtml}`;
  refreshIcons();
}

async function selectKnowledgeRevision(revisionId) {
  elements.knowledgeRevisionDetail.innerHTML = '<div class="empty-row">正在读取版本...</div>';
  try {
    appState.selectedKnowledgeRevision = await api(`${appState.knowledgeRevisionContext.apiBase}/${encodeURIComponent(revisionId)}`);
    renderKnowledgeRevisionList();
    renderKnowledgeRevisionDetail();
  } catch (error) {
    elements.knowledgeRevisionDetail.innerHTML = `<div class="empty-row">${escapeHtml(error.message)}</div>`;
  }
}

async function loadKnowledgeRevisions({ selectCurrent = false } = {}) {
  elements.knowledgeRevisionSummary.textContent = "正在加载...";
  elements.knowledgeRevisionList.innerHTML = '<div class="empty-row">正在读取版本记录...</div>';
  try {
    const payload = await api(appState.knowledgeRevisionContext.apiBase);
    appState.knowledgeRevisions = payload.items || [];
    elements.knowledgeRevisionSummary.textContent = `${payload.total || 0} 个版本 · 恢复操作会生成新版本`;
    const preferred = selectCurrent
      ? payload.current_revision
      : (appState.selectedKnowledgeRevision?.revision_id || payload.current_revision || appState.knowledgeRevisions[0]?.revision_id);
    if (preferred) await selectKnowledgeRevision(preferred);
    else renderKnowledgeRevisionList();
  } catch (error) {
    elements.knowledgeRevisionSummary.textContent = "加载失败";
    elements.knowledgeRevisionList.innerHTML = `<div class="empty-row">${escapeHtml(error.message)}</div>`;
  }
}

function knowledgeDocumentRevisionContext() {
  const document = appState.currentKnowledge;
  if (!isKnowledgeDocumentTemplate(document?.id)) return null;
  return {
    documentId: document.id,
    title: `${document.title || "知识文档"} · 历史版本`,
    apiBase: `/api/knowledge/${encodeURIComponent(document.id)}/revisions`,
    currentContent: () => elements.knowledgeEditorInput.value,
    hasUnsavedChanges: () => appState.knowledgeDirty,
    async onRestored(restored) {
      appState.currentKnowledge.content = restored.content || "";
      appState.currentKnowledge.modified_at = restored.modified_at || "";
      elements.knowledgeEditorInput.value = restored.content || "";
      elements.knowledgeEditorStatus.textContent = restored.modified_at ? `已恢复 · 更新于 ${formatKnowledgeStatusDate(restored.modified_at)}` : "已恢复";
      setKnowledgeDirty(false);
      setKnowledgeEditorSingleMode("preview");
    },
  };
}

function openKnowledgeRevisionDrawer(context = null) {
  const nextContext = context || knowledgeDocumentRevisionContext();
  if (!nextContext?.apiBase) return;
  appState.knowledgeRevisionContext = nextContext;
  elements.knowledgeRevisionTitle.textContent = nextContext.title || "历史版本";
  elements.knowledgeRevisionDrawer.querySelector(".knowledge-revision-panel")?.setAttribute("aria-label", nextContext.title || "知识文档历史版本");
  elements.knowledgeRevisionDrawer.hidden = false;
  appState.knowledgeRevisionDetailMode = "diff";
  loadKnowledgeRevisions();
}

function closeKnowledgeRevisionDrawer() {
  elements.knowledgeRevisionDrawer.hidden = true;
  appState.knowledgeRevisions = [];
  appState.selectedKnowledgeRevision = null;
  appState.knowledgeRevisionContext = null;
}

async function restoreSelectedKnowledgeRevision() {
  const revision = appState.selectedKnowledgeRevision;
  const context = appState.knowledgeRevisionContext;
  if (!revision || revision.is_current || !context) return;
  const warning = context.hasUnsavedChanges?.()
    ? `当前有未保存修改。恢复 ${revision.revision_id} 会覆盖这些修改，并生成一个新版本，是否继续？`
    : `确定恢复 ${revision.revision_id} 吗？恢复后会生成一个新版本。`;
  if (!window.confirm(warning)) return;
  const button = elements.knowledgeRevisionDetail.querySelector("[data-knowledge-revision-restore]");
  if (button) button.disabled = true;
  try {
    const restored = await accountApi(`${context.apiBase}/${encodeURIComponent(revision.revision_id)}/restore`, {
      method: "POST",
      body: JSON.stringify({ summary: `恢复自 ${revision.revision_id}` }),
    });
    await context.onRestored?.(restored, revision);
    await loadKnowledgeRevisions({ selectCurrent: true });
    showToast(`已恢复 ${revision.revision_id}，并生成新版本`);
  } catch (error) {
    showToast(error.message);
    if (button) button.disabled = false;
  }
}

window.AIDWKnowledgeEditor = {
  applyPresentation: applyKnowledgeDocumentEditorPresentation,
  renderMarkdown,
  lineDiff: knowledgeLineDiff,
  openRevisionDrawer: openKnowledgeRevisionDrawer,
  closeRevisionDrawer: closeKnowledgeRevisionDrawer,
};

async function openKnowledgeDocument(documentId) {
  setKnowledgeEditorVisible(true);
  configureKnowledgeEditorPresentation(documentId);
  elements.knowledgeEditorTitle.textContent = "加载中...";
  elements.knowledgeEditorDescription.textContent = "";
  elements.knowledgeEditorStatus.textContent = "";
  elements.knowledgeEditorFilename.textContent = "";
  elements.knowledgeEditorInput.value = "";
  elements.knowledgeEditorInput.disabled = true;
  elements.knowledgeEditorPreview.innerHTML = '<div class="empty-row">正在读取最新内容...</div>';
  elements.knowledgeSave.disabled = true;
  try {
    const document = await api(`/api/knowledge/${encodeURIComponent(documentId)}`);
    appState.currentKnowledge = document;
    appState.knowledgeDirty = false;
    elements.knowledgeEditorTitle.textContent = document.title;
    const organizationLabel = document.organization_type === "directory" ? "目录型文档" : (document.organization_type ? "单篇文档" : "");
    elements.knowledgeEditorDescription.textContent = [organizationLabel, document.description].filter(Boolean).join(" · ");
    elements.knowledgeEditorFilename.textContent = document.filename || "";
    elements.knowledgeEditorInput.value = document.content || "";
    elements.knowledgeEditorInput.disabled = false;
    elements.knowledgeEditorStatus.textContent = isKnowledgeDocumentTemplate(documentId) && document.modified_at
      ? `已保存 · 更新于 ${formatKnowledgeStatusDate(document.modified_at)}`
      : (document.modified_at ? `已加载 · ${document.modified_at}` : "已加载");
    renderKnowledgePreview();
    elements.knowledgeEditorInput.setSelectionRange(0, 0);
    elements.knowledgeEditorInput.scrollTop = 0;
    elements.knowledgeEditorPreview.scrollTop = 0;
    if (!elements.knowledgeEditor.classList.contains("is-single-pane")) {
      elements.knowledgeEditorInput.focus({ preventScroll: true });
    }
  } catch (error) {
    appState.currentKnowledge = null;
    elements.knowledgeDownload.hidden = true;
    elements.knowledgeEditorTitle.textContent = "加载失败";
    elements.knowledgeEditorStatus.textContent = "";
    elements.knowledgeEditorPreview.innerHTML = `<div class="empty-row">${escapeHtml(error.message)}</div>`;
    showToast(error.message);
  }
  refreshIcons();
}

function knowledgeDownloadFilename(knowledgeDocument) {
  const fallback = `${knowledgeDocument?.title || "knowledge-document"}.md`;
  const rawName = String(knowledgeDocument?.filename || fallback).split(/[\\/]/).pop();
  const safeName = rawName.replace(/[\\/:*?"<>|]/g, "_").trim() || "knowledge-document.md";
  return /\.[a-z0-9]+$/i.test(safeName) ? safeName : `${safeName}.md`;
}

function downloadKnowledgeDocument() {
  const knowledgeDocument = appState.currentKnowledge;
  if (!knowledgeDocument) return;
  const content = elements.knowledgeEditorInput.value ?? knowledgeDocument.content ?? "";
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = knowledgeDownloadFilename(knowledgeDocument);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function openKnowledgeDeleteDialog() {
  if (!appState.currentKnowledge) return;
  elements.knowledgeDeleteName.textContent = appState.currentKnowledge.title || "未命名知识";
  elements.knowledgeDeleteError.textContent = "";
  elements.knowledgeDeleteError.hidden = true;
  elements.knowledgeDeleteConfirm.disabled = false;
  elements.knowledgeDeleteDialog.showModal();
  window.setTimeout(() => elements.knowledgeDeleteCancel.focus(), 0);
  refreshIcons();
}

function closeKnowledgeDeleteDialog() {
  if (elements.knowledgeDeleteDialog.open) elements.knowledgeDeleteDialog.close();
  elements.knowledgeDeleteError.textContent = "";
  elements.knowledgeDeleteError.hidden = true;
}

async function deleteKnowledgeDocument() {
  const document = appState.currentKnowledge;
  if (!document) return;
  elements.knowledgeDeleteConfirm.disabled = true;
  try {
    await accountApi(`/api/knowledge/${encodeURIComponent(document.id)}`, { method: "DELETE" });
    closeKnowledgeDeleteDialog();
    appState.currentKnowledge = null;
    appState.knowledgeDirty = false;
    elements.knowledgeEditorInput.value = "";
    elements.knowledgeEditorPreview.replaceChildren();
    configureKnowledgeEditorPresentation("");
    setKnowledgeEditorVisible(false);
    await loadKnowledge();
    showToast("知识已删除");
  } catch (error) {
    elements.knowledgeDeleteError.textContent = error.message || "删除失败";
    elements.knowledgeDeleteError.hidden = false;
    elements.knowledgeDeleteConfirm.disabled = false;
  }
}

function closeKnowledgeEditor() {
  if (appState.knowledgeDirty && !window.confirm("当前文档有未保存的修改，确定返回吗？")) return;
  appState.currentKnowledge = null;
  appState.knowledgeDirty = false;
  elements.knowledgeEditorInput.value = "";
  elements.knowledgeEditorPreview.replaceChildren();
  configureKnowledgeEditorPresentation("");
  setKnowledgeEditorVisible(false);
  loadKnowledge();
}

async function saveKnowledgeDocument() {
  if (!appState.currentKnowledge || !appState.knowledgeDirty) return;
  const documentId = appState.currentKnowledge.id;
  const content = elements.knowledgeEditorInput.value;
  elements.knowledgeEditorStatus.textContent = "保存中...";
  elements.knowledgeSave.disabled = true;
  try {
    const saved = await accountApi(`/api/knowledge/${encodeURIComponent(documentId)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    appState.currentKnowledge.content = content;
    appState.currentKnowledge.modified_at = saved.modified_at || "";
    appState.knowledgeDirty = false;
    elements.knowledgeEditorStatus.textContent = saved.modified_at ? `已保存 · 更新于 ${formatKnowledgeStatusDate(saved.modified_at)}` : "已保存";
    await loadKnowledge();
    if (!elements.knowledgeRevisionDrawer.hidden && appState.knowledgeRevisionContext?.documentId === documentId) {
      await loadKnowledgeRevisions({ selectCurrent: true });
    }
    showToast("知识文档已保存");
  } catch (error) {
    elements.knowledgeEditorStatus.textContent = "保存失败";
    elements.knowledgeSave.disabled = false;
    showToast(error.message);
  }
}

function formatBytes(size) {
  const bytes = Number(size || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function artifactStageFromName(name) {
  const value = String(name || "");
  if (/requirement_review_report/.test(value)) return "requirement_review";
  if (/warehouse_research_report/.test(value)) return "warehouse_research";
  if (/model_design_report/.test(value)) return "model_design";
  if (/data_development_report/.test(value)) return "data_development";
  if (/data_validation_report/.test(value)) return "data_validation";
  if (/solution_review_report/.test(value)) return "solution_review";
  return "";
}

function syncArtifactVersion() {
  const artifact = appState.currentArtifact;
  const stage = artifact?.stage || "";
  const gate = stage ? appState.reviewGates?.stages?.[stage] : null;
  const version = artifact?.version || gate?.version || "";
  const isHistorical = artifact?.is_current === false;
  const stateLabel = version ? (isHistorical ? "历史版本" : "当前版本") : "";
  elements.artifactMeta.textContent = [version, stateLabel].filter(Boolean).join(" · ");
}

function artifactRequirementId(artifact) {
  if (artifact?.requirement_id) return artifact.requirement_id;
  const match = String(artifact?.content_url || "").match(/^\/api\/requirements\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : appState.requirementId;
}

function renderArtifactPayload(payload, context = {}) {
  appState.currentArtifact = { ...appState.currentArtifact, ...payload, ...context, loading: false };
  elements.artifactName.textContent = payload.display_name || payload.name || "文件";
  elements.artifactContent.textContent = payload.content || "";
  elements.artifactPreview.innerHTML = renderMarkdown(payload.content || "");
  const previewable = ["md", "markdown"].includes(attachmentExtension(payload.name || ""));
  elements.artifactPreview.hidden = !previewable;
  elements.artifactContent.closest("pre").hidden = previewable;
  syncArtifactVersion();
  elements.artifactCopy.disabled = false;
  elements.artifactDownload.disabled = !payload.download_url;
}

function syncArtifactVersionControls(hasVersions) {
  elements.artifactVersionsOpen.hidden = !hasVersions;
  elements.artifactCopy.hidden = hasVersions;
  elements.artifactDownload.hidden = hasVersions;
  const expanded = hasVersions && !elements.artifactVersionSidebar.hidden;
  elements.artifactVersionsOpen.setAttribute("aria-expanded", String(expanded));
  elements.artifactVersionsOpen.setAttribute("aria-label", expanded ? "收起版本历史" : "展开版本历史");
  elements.artifactVersionsOpen.title = expanded ? "收起版本历史" : "展开版本历史";
  elements.artifactVersionsOpen.innerHTML = `<i data-lucide="${expanded ? "panel-left-close" : "panel-left-open"}"></i>`;
}

function renderArtifactVersionList() {
  const selectedVersion = appState.currentArtifact?.version || "";
  elements.artifactVersionList.innerHTML = appState.artifactVersions.map((item) => `
    <div class="artifact-version-item ${item.version === selectedVersion ? "is-active" : ""}">
      <button class="artifact-version-main" type="button" data-artifact-version="${escapeHtml(item.version)}" aria-label="查看 ${escapeHtml(item.version)}">
        <strong>${escapeHtml(item.version)}</strong><span class="artifact-version-state ${item.is_current ? "is-current" : ""}">${item.is_current ? "当前" : "历史"}</span>
      </button>
      <small class="artifact-version-time">${escapeHtml(formatAccountDate(item.created_at))}</small>
      <span class="artifact-version-actions">
        <button class="icon-button" type="button" data-artifact-version-copy="${escapeHtml(item.version)}" aria-label="复制 ${escapeHtml(item.version)}" title="复制该版本"><i data-lucide="copy"></i></button>
        <button class="icon-button" type="button" data-artifact-version-download="${escapeHtml(item.version)}" aria-label="下载 ${escapeHtml(item.version)}" title="下载该版本"><i data-lucide="download"></i></button>
      </span>
    </div>
  `).join("") || '<div class="artifact-version-empty">暂无历史版本</div>';
  elements.artifactVersionList.querySelectorAll("[data-artifact-version]").forEach((button) => {
    button.addEventListener("click", () => selectArtifactVersion(button.dataset.artifactVersion));
  });
  elements.artifactVersionList.querySelectorAll("[data-artifact-version-copy]").forEach((button) => {
    button.addEventListener("click", () => copyArtifactVersion(button.dataset.artifactVersionCopy));
  });
  elements.artifactVersionList.querySelectorAll("[data-artifact-version-download]").forEach((button) => {
    button.addEventListener("click", () => downloadArtifactVersion(button.dataset.artifactVersionDownload));
  });
  refreshIcons();
}

async function openArtifactVersions() {
  const artifact = appState.currentArtifact;
  if (!artifact?.requirement_id || !artifact.stage) return;
  elements.artifactVersionSidebar.hidden = false;
  syncArtifactVersionControls(true);
  elements.artifactVersionList.innerHTML = '<div class="artifact-version-empty">正在读取版本历史...</div>';
  refreshIcons();
  try {
    const payload = await api(`/api/requirements/${encodeURIComponent(artifact.requirement_id)}/review-gates/${encodeURIComponent(artifact.stage)}/versions`);
    appState.artifactVersions = payload.items || [];
    renderArtifactVersionList();
  } catch (error) {
    elements.artifactVersionList.innerHTML = `<div class="artifact-version-empty">${escapeHtml(error.message)}</div>`;
  }
}

function closeArtifactVersions() {
  elements.artifactVersionSidebar.hidden = true;
  syncArtifactVersionControls(Boolean(appState.currentArtifact?.requirement_id && appState.currentArtifact?.stage));
  refreshIcons();
}

function toggleArtifactVersions() {
  if (elements.artifactVersionSidebar.hidden) openArtifactVersions();
  else closeArtifactVersions();
}

async function artifactVersionPayload(version) {
  const item = appState.artifactVersions.find((candidate) => candidate.version === version);
  if (!item) throw new Error("产物版本不存在");
  if (appState.currentArtifact?.version === version && appState.currentArtifact?.content) return appState.currentArtifact;
  return api(item.content_url);
}

async function copyArtifactVersion(version) {
  try {
    const payload = await artifactVersionPayload(version);
    await navigator.clipboard.writeText(payload.content || "");
    showToast(`${payload.display_name || payload.name || "产物"} ${version} 已复制`);
  } catch (error) {
    showToast(error.name === "NotAllowedError" ? "浏览器未允许复制" : error.message);
  }
}

function downloadArtifactVersion(version) {
  const item = appState.artifactVersions.find((candidate) => candidate.version === version);
  if (!item?.download_url) return;
  const name = item.report_file || item.name || "artifact.md";
  const extensionAt = name.lastIndexOf(".");
  const versionedName = extensionAt > 0 ? `${name.slice(0, extensionAt)}_${version}${name.slice(extensionAt)}` : `${name}_${version}`;
  const link = document.createElement("a");
  link.href = item.download_url;
  link.download = versionedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function selectArtifactVersion(version) {
  const item = appState.artifactVersions.find((candidate) => candidate.version === version);
  const current = appState.currentArtifact;
  if (!item || !current || current.version === version) return;
  const requestId = appState.artifactRequestId + 1;
  appState.artifactRequestId = requestId;
  elements.artifactPreview.hidden = false;
  elements.artifactPreview.innerHTML = '<div class="artifact-loading">正在加载报告</div>';
  elements.artifactContent.closest("pre").hidden = true;
  elements.artifactCopy.disabled = true;
  elements.artifactDownload.disabled = true;
  try {
    const payload = await api(item.content_url);
    if (appState.artifactRequestId !== requestId) return;
    renderArtifactPayload(payload, { stage: current.stage, requirement_id: current.requirement_id });
    renderArtifactVersionList();
    refreshIcons();
  } catch (error) {
    if (appState.artifactRequestId !== requestId) return;
    renderArtifactPayload(current, { stage: current.stage, requirement_id: current.requirement_id });
    showToast(error.message);
  }
}

async function openArtifact(artifact, stage = "") {
  const requestId = appState.artifactRequestId + 1;
  const artifactStage = stage || artifactStageFromName(artifact.name || artifact.display_name);
  const requirementId = artifactRequirementId(artifact);
  appState.artifactRequestId = requestId;
  appState.artifactVersions = [];
  appState.currentArtifact = { ...artifact, stage: artifactStage, requirement_id: requirementId, content: "", loading: true };
  elements.artifactName.textContent = artifact.display_name || artifact.name || "文件";
  syncArtifactVersion();
  elements.artifactVersionSidebar.hidden = !(requirementId && artifactStage);
  elements.artifactVersionList.replaceChildren();
  elements.artifactVersionsOpen.disabled = true;
  syncArtifactVersionControls(Boolean(requirementId && artifactStage));
  elements.artifactPreview.hidden = false;
  elements.artifactPreview.innerHTML = '<div class="artifact-loading">正在加载报告</div>';
  elements.artifactContent.closest("pre").hidden = true;
  elements.artifactContent.textContent = "";
  elements.artifactCopy.disabled = true;
  elements.artifactDownload.disabled = true;
  if (!elements.artifactPanel.open) elements.artifactPanel.showModal();
  refreshIcons();
  try {
    const payload = await api(artifact.content_url);
    if (appState.artifactRequestId !== requestId) return;
    const gateVersion = artifactStage ? appState.reviewGates?.stages?.[artifactStage]?.version : "";
    renderArtifactPayload({ ...payload, version: payload.version || artifact.version || gateVersion || "", is_current: true }, { stage: artifactStage, requirement_id: requirementId });
    elements.artifactVersionsOpen.disabled = false;
    if (requirementId && artifactStage) await openArtifactVersions();
    refreshIcons();
  } catch (error) {
    if (appState.artifactRequestId === requestId) closeArtifact();
    showToast(error.message);
  }
}

function closeArtifact() {
  appState.artifactRequestId += 1;
  appState.currentArtifact = null;
  appState.artifactVersions = [];
  if (elements.artifactPanel.open) elements.artifactPanel.close();
  closeArtifactVersions();
  elements.artifactVersionsOpen.hidden = true;
  elements.artifactPreview.replaceChildren();
  elements.artifactContent.textContent = "";
}

async function copyArtifact() {
  if (!appState.currentArtifact) return;
  try {
    await navigator.clipboard.writeText(appState.currentArtifact.content || "");
    showToast("文件内容已复制");
  } catch (_error) {
    showToast("浏览器未允许复制");
  }
}

async function copyRequirementId() {
  if (!appState.requirementId) return;
  try {
    await navigator.clipboard.writeText(appState.requirementId);
    showToast("需求ID已复制");
  } catch (_error) {
    showToast("浏览器未允许复制");
  }
}

function downloadArtifact() {
  const url = appState.currentArtifact?.download_url;
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = appState.currentArtifact.name || "artifact.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openRequirementDialog() {
  elements.requirementForm.reset();
  elements.requirementFormError.textContent = "";
  elements.requirementDialog.showModal();
  document.getElementById("requirement-title").focus();
}

async function createRequirement(event) {
  event.preventDefault();
  const formData = new FormData(elements.requirementForm);
  elements.requirementFormError.textContent = "";
  try {
    const created = await accountApi("/api/requirements", {
      method: "POST",
      body: JSON.stringify({ title: formData.get("title"), content: formData.get("content"), space_id: activeSpaceId }),
    });
    elements.requirementDialog.close();
    await loadRequirements();
    if (created.conversation_id) await openConversation(created.conversation_id);
    showToast("需求已创建，流程已开始");
  } catch (error) {
    elements.requirementFormError.textContent = error.message;
  }
}

async function copyStageExecutionSummary(button) {
  try {
    await navigator.clipboard.writeText(button.dataset.stageExecutionCopy || "");
    button.classList.add("is-copied");
    button.innerHTML = icon("check");
    refreshIcons();
    showToast("执行摘要已复制");
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.classList.remove("is-copied");
      button.innerHTML = icon("copy");
      refreshIcons();
    }, 1400);
  } catch (_error) {
    showToast("复制失败，请重试");
  }
}

async function confirmStageChoice(button) {
  const request = button.closest("[data-stage-confirmation-id]");
  const selected = request?.querySelector("input[data-stage-confirmation-option]:checked");
  if (!request || !selected || !appState.requirementId) {
    showToast("请选择一个口径");
    return;
  }
  button.disabled = true;
  try {
    const result = await accountApi(
      `/api/requirements/${encodeURIComponent(appState.requirementId)}/confirmations/${encodeURIComponent(request.dataset.stageConfirmationId)}/confirm`,
      { method: "POST", body: JSON.stringify({ value: selected.value }) },
    );
    showToast("已采用该口径");
    await openConversation(result.conversation_id || appState.conversationId);
  } catch (error) {
    button.disabled = false;
    showToast(error.message);
  }
}

document.getElementById("new-chat-button").addEventListener("click", () => startNewChat());
elements.messageList.addEventListener("click", (event) => {
  const confirmationButton = event.target.closest("button[data-stage-confirmation-submit]");
  if (confirmationButton) {
    confirmStageChoice(confirmationButton);
    return;
  }
  const copyButton = event.target.closest("button[data-stage-execution-copy]");
  if (copyButton) {
    copyStageExecutionSummary(copyButton);
    return;
  }
  const button = event.target.closest("button[data-execution-detail-mode]");
  if (button) setExecutionResultView(button);
});
elements.brandCollapse.addEventListener("click", () => setBrandCollapsed(!appState.brandCollapsed));
elements.taskPanelToggle.addEventListener("click", () => setTaskPanelCollapsed(!appState.taskPanelCollapsed));
elements.mobileTaskToggle.addEventListener("click", () => {
  elements.app.classList.toggle("mobile-task-open");
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".model-picker")) closeModelMenu();
  if (!event.target.closest(".task-type-picker")) closeTaskTypeMenu();
  if (!event.target.closest(".workspace-switcher")) closeWorkspaceMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModelMenu();
    closeTaskTypeMenu();
    closeWorkspaceMenu();
  }
});
document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const targetView = button.dataset.view;
    const hasUnsavedKnowledgeAsset = Boolean(window.AIDWKnowledgeHub?.hasUnsavedAssetChanges?.());
    if (
      appState.view === "knowledge"
      && targetView !== "knowledge"
      && (appState.knowledgeDirty || hasUnsavedKnowledgeAsset)
      && !window.confirm("当前知识文档有未保存的修改，确定离开吗？")
    ) return;
    if (
      appState.view === "skills"
      && targetView !== "skills"
      && window.DWAgentSkills?.isDirty?.()
      && !window.confirm("当前 Skill 文件有未保存的修改，确定离开吗？")
    ) return;
    if (targetView !== "knowledge" && hasUnsavedKnowledgeAsset) {
      window.AIDWKnowledgeHub?.discardUnsavedAssetChanges?.();
    }
    setView(targetView);
    if (targetView === "requirements") loadRequirements();
    if (targetView === "tasks") loadTasks();
    if (targetView === "knowledge") {
      if (appState.configKnowledgeMode === "library" && typeof loadLibraryBases === "function") loadLibraryBases();
      else loadKnowledge();
    }
    if (targetView === "skills") window.DWAgentSkills?.onViewEnter();
  });
});
document.getElementById("clear-task-button").addEventListener("click", () => startNewChat());
elements.clearSupplementContext.addEventListener("click", clearSupplementContext);
elements.clearWorkflowRerun.addEventListener("click", () => clearStageRerun());
elements.sendButton.addEventListener("click", sendMessage);
elements.demoStart.addEventListener("click", startDemoConversation);
elements.demoRerun.addEventListener("click", rerunDemoConversation);
elements.workflowToggle.addEventListener("click", () => {
  if (!(appState.intent === "requirement" || appState.requirementId)) {
    showToast("当前对话还没有需求评审");
    return;
  }
  setWorkflowDrawer(!appState.workflowDrawerOpen);
});
elements.workflowClose.addEventListener("click", () => setWorkflowDrawer(false));
elements.drawerRequirementCopy.addEventListener("click", copyRequirementId);
elements.fileButton.addEventListener("click", () => elements.fileInput.click());
elements.workspaceTrigger.addEventListener("click", () => {
  const open = elements.workspaceMenu.hidden;
  elements.workspaceMenu.hidden = !open;
  elements.workspaceTrigger.setAttribute("aria-expanded", String(open));
});
elements.spaceFlyoutTrigger.addEventListener("click", () => {
  const open = elements.spacePickerFlyout.hidden;
  elements.spacePickerFlyout.hidden = !open;
  elements.spaceFlyoutTrigger.setAttribute("aria-expanded", String(open));
  if (open) {
    elements.spaceSearchInput.value = "";
    renderSpaceOptions();
    window.setTimeout(() => elements.spaceSearchInput.focus(), 0);
  }
});
elements.spaceSearchInput.addEventListener("input", renderSpaceOptions);
elements.spaceOptions.addEventListener("click", (event) => {
  const option = event.target.closest("button[data-space-id]");
  if (option) switchSpace(option.dataset.spaceId);
});
elements.accountHomeOpen.addEventListener("click", showAccountPage);
elements.accountLogo.addEventListener("click", showAgentPage);
elements.accountMainReturn.addEventListener("click", showAgentPage);
elements.accountLogout.addEventListener("click", logoutAccount);
elements.accountSpaceSearch.addEventListener("input", renderAccountSpaces);
elements.accountSpaceCreate.addEventListener("click", () => openSpaceForm());
elements.overviewBackSettings.addEventListener("click", () => showAccountView("spaces"));
elements.overviewNewChat.addEventListener("click", startOverviewChat);
elements.overviewOpenChat.addEventListener("click", startOverviewChat);
elements.overviewQuickChat.addEventListener("click", startOverviewChat);
elements.overviewQuickKnowledge.addEventListener("click", openOverviewKnowledge);
elements.overviewQuickSkills.addEventListener("click", () => { showAgentPage(); setView("skills"); });
elements.overviewModelPermissionsList.addEventListener("change", handleOverviewModelPermissionsChange);
elements.overviewModelPermissionsSave.addEventListener("click", saveOverviewModelPermissions);
document.addEventListener("aidw:space-changed", () => {
  loadModels();
  if (appState.view === "overview" && !elements.accountPage.hidden) loadSpaceOverview();
});
elements.accountUserSearch.addEventListener("input", renderAccountUsers);
elements.accountUserCreate.addEventListener("click", () => openUserForm());
elements.accountRoleSearch.addEventListener("input", renderAccountRoles);
elements.accountRoleCreate.addEventListener("click", () => openRoleForm());
elements.notificationRefreshChats.addEventListener("click", loadNotificationChats);
elements.notificationSave.addEventListener("click", () => saveNotificationSettings());
elements.notificationRefreshDeliveries.addEventListener("click", () => loadNotificationDeliveries().catch((error) => showToast(error.message)));
elements.notificationTemplateEvent.addEventListener("change", () => {
  captureNotificationTemplate();
  selectedNotificationTemplateEvent = elements.notificationTemplateEvent.value;
  window.setTimeout(() => renderNotificationTemplateEditor({ renderEventOptions: false }), 0);
});
[elements.notificationTemplateCardTitle, elements.notificationTemplateStatus, elements.notificationTemplateMention, elements.notificationTemplateButtonEnabled, elements.notificationTemplateButtonLabel].forEach((input) => {
  input.addEventListener("input", () => {
    elements.notificationTemplateButtonLabel.disabled = !elements.notificationTemplateButtonEnabled.checked;
    renderNotificationCardPreview();
  });
});
elements.notificationTemplateCardTitle.addEventListener("focus", () => { notificationTemplateVariableTarget = "title"; });
elements.notificationTemplateStatus.addEventListener("focus", () => { notificationTemplateVariableTarget = "status"; });
elements.notificationTemplateThemes.addEventListener("change", renderNotificationCardPreview);
elements.notificationTemplateFields.addEventListener("change", (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const checked = elements.notificationTemplateFields.querySelectorAll('input[type="checkbox"]:checked');
  if (!checked.length) {
    event.target.checked = true;
    showToast("卡片至少需要显示一个字段");
  }
  renderNotificationCardPreview();
});
elements.notificationTemplateFields.addEventListener("click", (event) => {
  const button = event.target.closest("[data-field-move]");
  if (button) moveNotificationField(button, Number(button.dataset.fieldMove));
});
elements.notificationTemplateVariables.addEventListener("click", (event) => {
  const button = event.target.closest("[data-template-variable]");
  if (!button) return;
  const input = notificationTemplateVariableTarget === "status"
    ? elements.notificationTemplateStatus : elements.notificationTemplateCardTitle;
  const token = `{{${button.dataset.templateVariable}}}`;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(token, start, end, "end");
  input.focus();
  renderNotificationCardPreview();
});
elements.notificationTemplateReset.addEventListener("click", () => {
  const defaults = notificationSettings?.default_templates?.[selectedNotificationTemplateEvent];
  if (!defaults) return;
  notificationSettings.templates[selectedNotificationTemplateEvent] = JSON.parse(JSON.stringify(defaults));
  renderNotificationTemplateEditor();
  showToast("当前卡片已恢复默认，保存后生效");
});
elements.notificationTemplateTestSpace.addEventListener("change", () => {
  elements.notificationTemplateTest.disabled = !notificationSettings?.routes?.[elements.notificationTemplateTestSpace.value]?.chat_id;
});
elements.notificationTemplateTest.addEventListener("click", () => sendNotificationTest(
  elements.notificationTemplateTestSpace.value,
  elements.notificationTemplateTest,
  selectedNotificationTemplateEvent,
));
elements.accountNavItems.forEach((item) => item.addEventListener("click", () => showAccountView(item.dataset.accountView)));
elements.mcpServerList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mcp-server-id]");
  if (!button) return;
  selectedMcpServerId = button.dataset.mcpServerId || "";
  renderMcpServers();
  renderMcpDetail();
});
elements.modelServiceAddModel.addEventListener("click", () => openModelServiceModelForm());
elements.modelServiceAddProvider.addEventListener("click", () => openModelServiceProviderForm());
elements.auditRefresh.addEventListener("click", () => loadAuditPage());
elements.modelServiceTabs.forEach((button) => button.addEventListener("click", () => setModelServiceTab(button.dataset.modelServiceTab)));
elements.modelServiceModelBody.addEventListener("click", handleModelServiceAction);
elements.modelServiceProviderBody.addEventListener("click", handleModelServiceAction);
elements.modelServiceModelForm.addEventListener("submit", saveModelServiceModel);
elements.modelServiceProviderForm.addEventListener("submit", saveModelServiceProvider);
elements.modelServiceModelClose.addEventListener("click", () => elements.modelServiceModelDialog.close());
elements.modelServiceModelCancel.addEventListener("click", () => elements.modelServiceModelDialog.close());
elements.modelServiceProviderClose.addEventListener("click", () => elements.modelServiceProviderDialog.close());
elements.modelServiceProviderCancel.addEventListener("click", () => elements.modelServiceProviderDialog.close());

elements.spaceForm.addEventListener("submit", submitSpaceForm);
elements.spaceFormClose.addEventListener("click", closeSpaceForm);
elements.spaceFormCancel.addEventListener("click", closeSpaceForm);
elements.spaceFormIcon.addEventListener("change", () => readSpaceIconFile(elements.spaceFormIcon.files?.[0]));
elements.spaceFormIconClear.addEventListener("click", () => {
  spaceFormIconValue = "";
  spaceFormIconDirty = true;
  elements.spaceFormIcon.value = "";
  renderSpaceFormIcon(elements.spaceFormName.value.trim());
});
elements.spaceFormName.addEventListener("input", () => {
  if (!isSpaceImage(spaceFormIconValue)) renderSpaceFormIcon(elements.spaceFormName.value.trim());
});
elements.spaceDeleteClose.addEventListener("click", closeSpaceDelete);
elements.spaceDeleteCancel.addEventListener("click", closeSpaceDelete);
elements.spaceDeleteConfirm.addEventListener("click", deleteSelectedSpace);
elements.userForm.addEventListener("submit", submitUserForm);
elements.userFormClose.addEventListener("click", closeUserForm);
elements.userFormCancel.addEventListener("click", closeUserForm);
elements.userDeleteClose.addEventListener("click", closeUserDelete);
elements.userDeleteCancel.addEventListener("click", closeUserDelete);
elements.userDeleteConfirm.addEventListener("click", deleteSelectedUser);
elements.roleForm.addEventListener("submit", submitRoleForm);
elements.roleFormClose.addEventListener("click", closeRoleForm);
elements.roleFormCancel.addEventListener("click", closeRoleForm);
elements.conversationDeleteClose.addEventListener("click", closeConversationDeleteDialog);
elements.conversationDeleteCancel.addEventListener("click", closeConversationDeleteDialog);
elements.conversationDeleteConfirm.addEventListener("click", confirmConversationDelete);
elements.conversationDeleteDialog.addEventListener("close", () => {
  appState.pendingConversationDelete = null;
  elements.conversationDeleteError.hidden = true;
  elements.conversationDeleteError.textContent = "";
});

[
  elements.spaceFormDialog,
  elements.spaceDeleteDialog,
  elements.userFormDialog,
  elements.userDeleteDialog,
  elements.conversationDeleteDialog,
  elements.knowledgeCategoryFormDialog,
  elements.knowledgeCategoryDeleteDialog,
  elements.knowledgeDeleteDialog,
  elements.knowledgeCreateDialog,
].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});
elements.modelButton.addEventListener("click", () => {
  if (elements.modelMenu.hidden) {
    closeTaskTypeMenu();
    openModelMenu();
  }
  else closeModelMenu();
});
elements.modelSearchInput.addEventListener("input", renderModelOptions);
elements.agentList.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-agent-toggle]");
  if (toggle) {
    setAgentEnabled(toggle.dataset.agentToggle, toggle.getAttribute("aria-checked") !== "true");
    return;
  }
  const useButton = event.target.closest("[data-agent-use]");
  if (!useButton || useButton.disabled) return;
  if (appState.generationStatus === "running") {
    showToast("请先停止当前生成，再切换 Agent", "warning");
    return;
  }
  const agentType = useButton.dataset.agentUse;
  if (agentType === appState.agentType) startNewChat();
  else setAgentType(agentType);
});
elements.taskTypeButton.addEventListener("click", () => {
  if (elements.taskTypeMenu.hidden) openTaskTypeMenu();
  else closeTaskTypeMenu();
});
elements.taskTypeMenu.addEventListener("keydown", (event) => {
  const options = [...elements.taskTypeMenu.querySelectorAll("button[data-task-type]")];
  if (event.key === "Escape") {
    event.preventDefault();
    closeTaskTypeMenu();
    elements.taskTypeButton.focus();
    return;
  }
  const currentIndex = options.indexOf(document.activeElement);
  let nextIndex = null;
  if (event.key === "ArrowDown") nextIndex = (currentIndex + 1 + options.length) % options.length;
  if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = options.length - 1;
  if (nextIndex === null || !options.length) return;
  event.preventDefault();
  options[nextIndex]?.focus();
});
elements.fileInput.addEventListener("change", async () => {
  const files = [...(elements.fileInput.files || [])];
  elements.fileInput.value = "";
  addPendingAttachments(files);
  elements.chatInput.focus();
});
elements.chatInput.addEventListener("paste", (event) => {
  const files = [...(event.clipboardData?.items || [])]
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  addPendingAttachments(files);
});
elements.chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    if (event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    sendMessage();
  }
});
elements.chatInput.addEventListener("input", syncComposerState);
document.getElementById("artifact-close").addEventListener("click", closeArtifact);
elements.artifactVersionsOpen.addEventListener("click", toggleArtifactVersions);
elements.artifactVersionsClose.addEventListener("click", closeArtifactVersions);
elements.artifactPanel.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeArtifact();
});
elements.artifactPanel.addEventListener("click", (event) => {
  if (event.target === elements.artifactPanel) closeArtifact();
});
elements.artifactCopy.addEventListener("click", copyArtifact);
elements.artifactDownload.addEventListener("click", downloadArtifact);
function resetRequirementPageAndRender() {
  appState.requirementPage = 1;
  renderRequirements();
}

function scrollRequirementsToTop() {
  elements.requirementsView.scrollTo({ top: 0, behavior: "auto" });
}

elements.conversationSearchToggle.addEventListener("click", () => {
  setConversationSearchOpen(elements.conversationSearch.hidden);
});
elements.conversationSearchInput.addEventListener("input", () => {
  appState.conversationQuery = elements.conversationSearchInput.value;
  renderConversations();
});
elements.conversationSearchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  setConversationSearchOpen(false, { clear: true });
  elements.conversationSearchToggle.focus();
});
elements.conversationSearchClear.addEventListener("click", () => {
  appState.conversationQuery = "";
  elements.conversationSearchInput.value = "";
  renderConversations();
  elements.conversationSearchInput.focus();
});

elements.requirementFilters.addEventListener("input", resetRequirementPageAndRender);
elements.requirementFilters.addEventListener("change", resetRequirementPageAndRender);
elements.requirementFilters.addEventListener("reset", () => window.setTimeout(resetRequirementPageAndRender, 0));
elements.requirementRefresh.addEventListener("click", loadRequirements);
elements.requirementCreatedAtSort.addEventListener("click", () => {
  appState.requirementCreatedAtSort = appState.requirementCreatedAtSort === "desc" ? "asc" : "desc";
  updateRequirementCreatedAtSortControl();
  renderRequirements();
});
elements.requirementPageSize.addEventListener("change", () => {
  appState.requirementPageSize = Number(elements.requirementPageSize.value) || 50;
  resetRequirementPageAndRender();
  scrollRequirementsToTop();
});
elements.requirementPagePrev.addEventListener("click", () => {
  appState.requirementPage = Math.max(1, appState.requirementPage - 1);
  renderRequirements();
  scrollRequirementsToTop();
});
elements.requirementPageNext.addEventListener("click", () => {
  appState.requirementPage += 1;
  renderRequirements();
  scrollRequirementsToTop();
});
document.querySelectorAll("[data-config-knowledge-mode]").forEach((button) => {
  button.addEventListener("click", () => setConfigKnowledgeMode(button.dataset.configKnowledgeMode));
});
elements.knowledgeSearch.addEventListener("input", renderKnowledgeDocuments);
elements.knowledgeCategoryAdd.addEventListener("click", () => openKnowledgeCategoryForm());
elements.knowledgeCategoryEdit.addEventListener("click", () => openKnowledgeCategoryForm(appState.knowledgeCategory));
elements.knowledgeCategoryDelete.addEventListener("click", openKnowledgeCategoryDelete);
elements.knowledgeCategoryForm.addEventListener("submit", saveKnowledgeCategory);
elements.knowledgeCategoryFormClose.addEventListener("click", closeKnowledgeCategoryForm);
elements.knowledgeCategoryFormCancel.addEventListener("click", closeKnowledgeCategoryForm);
elements.knowledgeCategoryDeleteClose.addEventListener("click", closeKnowledgeCategoryDelete);
elements.knowledgeCategoryDeleteCancel.addEventListener("click", closeKnowledgeCategoryDelete);
elements.knowledgeCategoryDeleteConfirm.addEventListener("click", deleteKnowledgeCategory);
elements.knowledgeEditorDelete.addEventListener("click", openKnowledgeDeleteDialog);
elements.knowledgeDownload.addEventListener("click", downloadKnowledgeDocument);
elements.knowledgeDeleteClose.addEventListener("click", closeKnowledgeDeleteDialog);
elements.knowledgeDeleteCancel.addEventListener("click", closeKnowledgeDeleteDialog);
elements.knowledgeDeleteConfirm.addEventListener("click", deleteKnowledgeDocument);
elements.knowledgeCreateOpen.addEventListener("click", openKnowledgeCreateDialog);
elements.knowledgeCreateForm.addEventListener("submit", submitKnowledgeCreate);
elements.knowledgeCreateFileOpen.addEventListener("click", (event) => { event.stopPropagation(); elements.knowledgeCreateFile.click(); });
elements.knowledgeCreateDropzone.addEventListener("click", (event) => { if (!event.target.closest("button")) elements.knowledgeCreateFile.click(); });
elements.knowledgeCreateDropzone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); elements.knowledgeCreateFile.click(); } });
["dragenter", "dragover"].forEach((name) => elements.knowledgeCreateDropzone.addEventListener(name, (event) => { event.preventDefault(); elements.knowledgeCreateDropzone.classList.add("is-dragging"); }));
["dragleave", "drop"].forEach((name) => elements.knowledgeCreateDropzone.addEventListener(name, (event) => { event.preventDefault(); elements.knowledgeCreateDropzone.classList.remove("is-dragging"); }));
elements.knowledgeCreateDropzone.addEventListener("drop", (event) => selectKnowledgeMarkdownFiles(event.dataTransfer.files));
elements.knowledgeCreateFile.addEventListener("change", () => selectKnowledgeMarkdownFiles(elements.knowledgeCreateFile.files));
elements.knowledgeCreateForm.querySelectorAll('input[name="organization_type"]').forEach((input) => input.addEventListener("change", () => {
  if (knowledgeCreateOrganizationType() === "single_page" && selectedKnowledgeMarkdownFiles.length > 1) {
    elements.knowledgeCreateError.textContent = "已切换为单篇文档，请重新选择 1 个文件";
    setKnowledgeMarkdownFiles();
  } else setKnowledgeMarkdownFiles(selectedKnowledgeMarkdownFiles);
}));
elements.knowledgeCreateFileClear.addEventListener("click", () => {
  setKnowledgeMarkdownFiles();
  elements.knowledgeCreateError.textContent = "";
});
document.getElementById("knowledge-create-close").addEventListener("click", closeKnowledgeCreateDialog);
document.getElementById("knowledge-create-cancel").addEventListener("click", closeKnowledgeCreateDialog);
elements.knowledgeCategoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-knowledge-category]");
  if (!button) return;
  appState.knowledgeCategory = button.dataset.knowledgeCategory;
  renderKnowledgeCategories();
  renderKnowledgeDocuments();
});
document.getElementById("requirement-dialog-close").addEventListener("click", () => elements.requirementDialog.close());
document.getElementById("requirement-cancel").addEventListener("click", () => elements.requirementDialog.close());
elements.requirementForm.addEventListener("submit", createRequirement);
document.getElementById("knowledge-back").addEventListener("click", closeKnowledgeEditor);
elements.knowledgeSave.addEventListener("click", saveKnowledgeDocument);
elements.knowledgeHistoryOpen.addEventListener("click", () => openKnowledgeRevisionDrawer());
elements.knowledgeRevisionClose.addEventListener("click", closeKnowledgeRevisionDrawer);
elements.knowledgeRevisionBackdrop.addEventListener("click", closeKnowledgeRevisionDrawer);
elements.knowledgeRevisionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-knowledge-revision]");
  if (button) selectKnowledgeRevision(button.dataset.knowledgeRevision);
});
elements.knowledgeRevisionDetail.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-knowledge-revision-mode]");
  if (modeButton) {
    appState.knowledgeRevisionDetailMode = modeButton.dataset.knowledgeRevisionMode;
    renderKnowledgeRevisionDetail();
    return;
  }
  if (event.target.closest("[data-knowledge-revision-restore]")) restoreSelectedKnowledgeRevision();
});
elements.knowledgeEditorSingleModeButtons.forEach((button) => button.addEventListener("click", () => {
  setKnowledgeEditorSingleMode(button.dataset.knowledgeEditorSingleMode, { focus: true });
}));
elements.knowledgeEditorSplit.addEventListener("click", () => toggleKnowledgeEditorSplit({ focus: true }));
elements.knowledgeEditorInput.addEventListener("input", () => {
  if (!appState.currentKnowledge) return;
  setKnowledgeDirty(elements.knowledgeEditorInput.value !== (appState.currentKnowledge.content || ""));
  renderKnowledgePreview();
});
elements.knowledgeEditorInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveKnowledgeDocument();
  }
});
window.addEventListener("beforeunload", (event) => {
  if (!appState.knowledgeDirty && !window.AIDWKnowledgeHub?.hasUnsavedAssetChanges?.()) return;
  event.preventDefault();
  event.returnValue = "";
});

window.setInterval(updateElapsedTimers, 1000);
window.setInterval(reconcileTerminalGeneration, 3000);

loadAgentSettings();
setAgentType(appState.agentType, { reset: false });
setSelectedAccount(storedAccount());
setBrandCollapsed(storedBoolean(BRAND_COLLAPSED_STORAGE_KEY, true), false);
setTaskPanelCollapsed(storedBoolean(TASK_PANEL_COLLAPSED_STORAGE_KEY, false), false);
renderTaskTypeButton();
Promise.all([initializeAccountWorkspace(), loadStatus(), loadConversations(), loadTasks(), loadKnowledge()])
  .then(async () => {
    await loadModels();
    const params = new URLSearchParams(window.location.search);
    if (params.get("account_view") === "skill-reviews") {
      showAccountPage();
      return showAccountView("skill-reviews").then(() => window.AIDWSkillReview?.open?.(params.get("skill_review_id") || ""));
    }
    const conversationId = params.get("conversation_id") || "";
    if (conversationId) return openConversation(conversationId, { anchor: params.get("anchor") || "" });
    return null;
  })
  .catch((error) => showToast(error.message))
  .finally(() => refreshIcons());
