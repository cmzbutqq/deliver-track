-- 订单完成自动计算积分触发器
-- 当订单状态变为DELIVERED时，根据订单金额计算积分并更新客户积分表

CREATE OR REPLACE FUNCTION trg_customer_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
    v_customer_id TEXT;
BEGIN
    -- 只在订单状态变为DELIVERED时触发
    IF NEW.status = 'DELIVERED' AND (OLD.status IS NULL OR OLD.status != 'DELIVERED') THEN
        -- 获取客户ID
        v_customer_id := NEW.customer_id;
        
        IF v_customer_id IS NOT NULL THEN
            -- 计算积分：每1元订单金额 = 1积分
            v_points := FLOOR(NEW.amount);
            
            -- 更新或插入客户积分记录
            INSERT INTO customer_points (
                id, customer_id, total_points, used_points, available_points, created_at, updated_at
            ) VALUES (
                gen_random_uuid()::text,
                v_customer_id,
                v_points,
                0,
                v_points,
                NOW(),
                NOW()
            )
            ON CONFLICT (customer_id) DO UPDATE SET
                total_points = customer_points.total_points + v_points,
                available_points = customer_points.available_points + v_points,
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_customer_points ON orders;
CREATE TRIGGER trg_customer_points
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'DELIVERED' AND (OLD.status IS NULL OR OLD.status != 'DELIVERED'))
    EXECUTE FUNCTION trg_customer_points();

