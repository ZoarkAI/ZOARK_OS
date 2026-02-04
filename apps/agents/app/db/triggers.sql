-- PostgreSQL triggers for ZOARK OS agent events

-- Function to notify when a task is stuck (ACTIVE for >48 hours)
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS trigger AS $$
BEGIN
  -- Check if task is stuck (ACTIVE and not updated in 48 hours)
  IF NEW.status = 'ACTIVE' AND
     NEW."lastUpdated" < NOW() - INTERVAL '48 hours' THEN
    -- Publish event to Redis via pg_notify
    PERFORM pg_notify('agent_events', json_build_object(
      'type', 'task_stuck',
      'task_id', NEW.id,
      'project_id', NEW."projectId",
      'last_updated', NEW."lastUpdated"
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on Task updates
DROP TRIGGER IF EXISTS task_update_trigger ON "Task";
CREATE TRIGGER task_update_trigger
AFTER UPDATE ON "Task"
FOR EACH ROW
EXECUTE FUNCTION notify_task_update();


-- Function to notify when an approval is overdue
CREATE OR REPLACE FUNCTION notify_approval_overdue()
RETURNS trigger AS $$
BEGIN
  -- Check if approval is overdue and not recently nudged
  IF NEW.status = 'PENDING' AND
     NEW.deadline < NOW() AND
     (NEW."lastNudgedAt" IS NULL OR NEW."lastNudgedAt" < NOW() - INTERVAL '24 hours') THEN
    -- Publish event to Redis
    PERFORM pg_notify('agent_events', json_build_object(
      'type', 'approval_overdue',
      'approval_id', NEW.id,
      'invoice_id', NEW."invoiceId",
      'assignee_email', NEW."assigneeEmail",
      'deadline', NEW.deadline
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on ApprovalStep updates
DROP TRIGGER IF EXISTS approval_overdue_trigger ON "ApprovalStep";
CREATE TRIGGER approval_overdue_trigger
AFTER UPDATE ON "ApprovalStep"
FOR EACH ROW
EXECUTE FUNCTION notify_approval_overdue();


-- Function to log invoice processing events
CREATE OR REPLACE FUNCTION notify_invoice_created()
RETURNS trigger AS $$
BEGIN
  -- Publish event when new invoice with PDF is created
  IF NEW."pdfUrl" IS NOT NULL THEN
    PERFORM pg_notify('agent_events', json_build_object(
      'type', 'invoice_created',
      'invoice_id', NEW.id,
      'project_id', NEW."projectId",
      'pdf_url', NEW."pdfUrl"
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on Invoice inserts
DROP TRIGGER IF EXISTS invoice_created_trigger ON "Invoice";
CREATE TRIGGER invoice_created_trigger
AFTER INSERT ON "Invoice"
FOR EACH ROW
EXECUTE FUNCTION notify_invoice_created();
