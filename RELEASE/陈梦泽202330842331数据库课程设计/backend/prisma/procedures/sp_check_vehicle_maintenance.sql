-- 车辆维修提醒存储过程
-- 功能：检查所有车辆的维修状态，返回需要维修和即将到期维修的车辆列表
-- 返回: JSON数组，包含车辆信息和维修状态

CREATE OR REPLACE FUNCTION sp_check_vehicle_maintenance()
RETURNS JSON AS $$
DECLARE
  v_vehicle RECORD;
  v_last_maintenance RECORD;
  v_days_since_maintenance INT;
  v_days_until_next INT;
  v_result JSON[] := '{}';
  v_item JSON;
BEGIN
  FOR v_vehicle IN
    SELECT *
    FROM vehicles
    WHERE status != 'SCRAPPED'
    ORDER BY plate_number
  LOOP
    -- 获取最后一次维修记录
    SELECT *
    INTO v_last_maintenance
    FROM vehicle_maintenances
    WHERE vehicle_id = v_vehicle.id
    ORDER BY maintenance_date DESC
    LIMIT 1;

    -- 计算距离上次维修的天数
    IF v_last_maintenance.id IS NOT NULL THEN
      v_days_since_maintenance := EXTRACT(DAY FROM (NOW() - v_last_maintenance.maintenance_date));
      
      -- 计算距离下次维修的天数
      IF v_last_maintenance.next_maintenance_date IS NOT NULL THEN
        v_days_until_next := EXTRACT(DAY FROM (v_last_maintenance.next_maintenance_date - NOW()));
      ELSE
        -- 如果没有设置下次维修日期，根据维修类型估算
        CASE v_last_maintenance.maintenance_type
          WHEN 'MAINTENANCE' THEN
            v_days_until_next := 90 - v_days_since_maintenance; -- 保养周期90天
          WHEN 'REPAIR' THEN
            v_days_until_next := 180 - v_days_since_maintenance; -- 维修后180天检查
          WHEN 'INSPECTION' THEN
            v_days_until_next := 365 - v_days_since_maintenance; -- 年检周期365天
          ELSE
            v_days_until_next := 90 - v_days_since_maintenance;
        END CASE;
      END IF;
    ELSE
      -- 没有维修记录，使用购买日期
      IF v_vehicle.purchase_date IS NOT NULL THEN
        v_days_since_maintenance := EXTRACT(DAY FROM (NOW() - v_vehicle.purchase_date));
        v_days_until_next := 90 - v_days_since_maintenance; -- 默认90天保养周期
      ELSE
        v_days_since_maintenance := NULL;
        v_days_until_next := NULL;
      END IF;
    END IF;

    -- 判断是否需要维修或即将到期
    IF v_days_until_next IS NOT NULL AND (v_days_until_next <= 7 OR v_days_since_maintenance >= 90) THEN
      v_item := json_build_object(
        'vehicle_id', v_vehicle.id,
        'plate_number', v_vehicle.plate_number,
        'vehicle_type', v_vehicle.vehicle_type,
        'status', v_vehicle.status,
        'last_maintenance_date', v_last_maintenance.maintenance_date,
        'days_since_maintenance', v_days_since_maintenance,
        'days_until_next', v_days_until_next,
        'maintenance_status', CASE
          WHEN v_days_until_next <= 0 THEN 'OVERDUE'
          WHEN v_days_until_next <= 7 THEN 'DUE_SOON'
          WHEN v_days_since_maintenance >= 90 THEN 'NEEDS_MAINTENANCE'
          ELSE 'OK'
        END
      );
      v_result := array_append(v_result, v_item);
    END IF;
  END LOOP;

  RETURN json_build_object(
    'vehicles', v_result,
    'total_count', array_length(v_result, 1)
  );
END;
$$ LANGUAGE plpgsql;

