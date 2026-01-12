-- 配送任务完成自动更新配送员统计触发器
-- 当配送任务状态变为COMPLETED时，自动更新配送员的统计数据

CREATE OR REPLACE FUNCTION trg_delivery_task_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id TEXT;
    v_order_status TEXT;
BEGIN
    -- 只在任务状态变为COMPLETED时触发
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- 获取订单ID
        v_order_id := NEW.order_id;
        
        -- 更新配送员的任务完成数
        UPDATE delivery_drivers
        SET total_orders = total_orders + 1,
            updated_at = NOW()
        WHERE id = NEW.driver_id;
        
        -- 如果任务类型是DELIVERY，检查订单是否完成
        IF NEW.task_type = 'DELIVERY' THEN
            -- 获取订单状态
            SELECT status INTO v_order_status FROM orders WHERE id = v_order_id;
            
            -- 如果订单状态是SHIPPING，更新为DELIVERED
            IF v_order_status = 'SHIPPING' THEN
                UPDATE orders
                SET status = 'DELIVERED',
                    actual_time = NOW(),
                    updated_at = NOW()
                WHERE id = v_order_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_delivery_task_completion ON delivery_tasks;
CREATE TRIGGER trg_delivery_task_completion
    AFTER UPDATE OF status ON delivery_tasks
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED'))
    EXECUTE FUNCTION trg_delivery_task_completion();

