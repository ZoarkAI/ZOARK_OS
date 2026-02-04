"""
APScheduler - Cron-based Agent Scheduling
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def friday_timesheet_reminder() -> None:
    logger.info("Running Friday timesheet reminder")
    from app.agents.timesheet_drafter import TimesheetDrafterAgent
    agent = TimesheetDrafterAgent()
    result = await agent.execute()
    logger.info(f"Timesheet reminder completed: {result}")


async def daily_task_health_check() -> None:
    logger.info("Running daily task health check")
    from app.agents.task_monitor import TaskMonitorAgent
    agent = TaskMonitorAgent()
    result = await agent.execute()
    logger.info(f"Task health check completed: {result}")


async def hourly_approval_nudge() -> None:
    logger.info("Running hourly approval nudge check")
    from app.agents.approval_nudger import ApprovalNudgerAgent
    agent = ApprovalNudgerAgent()
    result = await agent.execute()
    logger.info(f"Approval nudge completed: {result}")


def setup_scheduled_jobs() -> None:
    # Friday at 4 PM
    scheduler.add_job(
        friday_timesheet_reminder,
        CronTrigger(day_of_week='fri', hour=16, minute=0),
        id='timesheet_reminder',
        name='Friday Timesheet Reminder',
        replace_existing=True
    )

    # Daily at 9 AM
    scheduler.add_job(
        daily_task_health_check,
        CronTrigger(hour=9, minute=0),
        id='task_health_check',
        name='Daily Task Health Check',
        replace_existing=True
    )

    # Every hour
    scheduler.add_job(
        hourly_approval_nudge,
        CronTrigger(minute=0),
        id='approval_nudge',
        name='Hourly Approval Nudge',
        replace_existing=True
    )

    logger.info("Scheduled jobs configured")


def start_scheduler() -> None:
    setup_scheduled_jobs()
    scheduler.start()
    logger.info(f"Scheduler started at {datetime.now()}")
