-- 客户评价统计触发器
-- 功能：当客户评价创建时，自动更新商家和配送员的平均评分

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_update_merchant_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_merchant_id TEXT;
  v_driver_id TEXT;
  v_avg_rating DOUBLE PRECISION;
BEGIN
  -- 获取订单的商家ID和配送员ID
  SELECT merchant_id, delivery_driver_id INTO v_merchant_id, v_driver_id
  FROM orders
  WHERE id = NEW.order_id;

  -- 更新商家的平均评分（基于该商家所有订单的评价）
  IF v_merchant_id IS NOT NULL THEN
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
    FROM customer_reviews cr
    JOIN orders o ON cr.order_id = o.id
    WHERE o.merchant_id = v_merchant_id;

    -- 注意：这里不直接更新merchant表，因为merchant表没有avg_rating字段
    -- 如果需要，可以在merchant表中添加avg_rating字段
  END IF;

  -- 更新配送员的平均评分
  IF v_driver_id IS NOT NULL THEN
    SELECT COALESCE(AVG(cr.rating), 0) INTO v_avg_rating
    FROM customer_reviews cr
    JOIN orders o ON cr.order_id = o.id
    WHERE o.delivery_driver_id = v_driver_id;

    UPDATE delivery_drivers
    SET avg_rating = v_avg_rating
    WHERE id = v_driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_update_merchant_rating ON customer_reviews;
CREATE TRIGGER trg_update_merchant_rating
  AFTER INSERT ON customer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_merchant_rating();

