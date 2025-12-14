-- 配送员任务汇总视图
-- 包含: 配送员信息、任务统计、完成率、平均完成时间等

CREATE OR REPLACE VIEW v_driver_task_summary AS
SELECT 
    dd.id AS driver_id,
    dd.name AS driver_name,
    dd.phone AS driver_phone,
    dd.status AS driver_status,
    COUNT(dt.id) AS total_tasks,
    COUNT(CASE WHEN dt.status = 'COMPLETED' THEN dt.id END) AS completed_tasks,
    COUNT(CASE WHEN dt.status = 'PENDING' THEN dt.id END) AS pending_tasks,
    COUNT(CASE WHEN dt.status = 'IN_PROGRESS' THEN dt.id END) AS in_progress_tasks,
    COUNT(CASE WHEN dt.status = 'CANCELLED' THEN dt.id END) AS cancelled_tasks,
    CASE 
        WHEN COUNT(dt.id) > 0 THEN 
            COUNT(CASE WHEN dt.status = 'COMPLETED' THEN dt.id END)::DOUBLE PRECISION / COUNT(dt.id)::DOUBLE PRECISION
        ELSE 0
    END AS completion_rate,
    AVG(CASE 
        WHEN dt.status = 'COMPLETED' AND dt.completed_at IS NOT NULL AND dt.assigned_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (dt.completed_at - dt.assigned_at)) / 60
    END) AS avg_completion_time_minutes,
    COUNT(CASE WHEN dt.task_type = 'PICKUP' THEN dt.id END) AS pickup_tasks,
    COUNT(CASE WHEN dt.task_type = 'DELIVERY' THEN dt.id END) AS delivery_tasks,
    COUNT(CASE WHEN dt.task_type = 'RETURN' THEN dt.id END) AS return_tasks,
    dd.total_orders,
    dd.avg_rating,
    dd.on_time_rate
FROM delivery_drivers dd
LEFT JOIN delivery_tasks dt ON dd.id = dt.driver_id
GROUP BY dd.id, dd.name, dd.phone, dd.status, dd.total_orders, dd.avg_rating, dd.on_time_rate;

