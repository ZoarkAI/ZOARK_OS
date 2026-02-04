# Agent implementations
try:
    from app.agents.task_monitor import TaskMonitorAgent
except ImportError:
    TaskMonitorAgent = None

try:
    from app.agents.timesheet_drafter import TimesheetDrafterAgent
except ImportError:
    TimesheetDrafterAgent = None

try:
    from app.agents.approval_nudger import ApprovalNudgerAgent
except ImportError:
    ApprovalNudgerAgent = None

try:
    from app.agents.email_parser import EmailParserAgent
except ImportError:
    EmailParserAgent = None

try:
    from app.agents.broadcast_agent import BroadcastAgent
except ImportError:
    BroadcastAgent = None

try:
    from app.agents.document_indexer import DocumentIndexerAgent
except ImportError:
    DocumentIndexerAgent = None

try:
    from app.agents.task_escalator import TaskEscalatorAgent
except ImportError:
    TaskEscalatorAgent = None

try:
    from app.agents.team_coordinator import TeamCoordinatorAgent
except ImportError:
    TeamCoordinatorAgent = None

__all__ = [
    "TaskMonitorAgent",
    "TimesheetDrafterAgent",
    "ApprovalNudgerAgent",
    "EmailParserAgent",
    "BroadcastAgent",
    "DocumentIndexerAgent",
    "TaskEscalatorAgent",
    "TeamCoordinatorAgent",
]
