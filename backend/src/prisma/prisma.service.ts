import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, OrderStatus } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ 数据库连接成功');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // ========== 存储过程调用方法 ==========

  /**
   * 调用配送费用计算存储过程
   * @param orderId 订单ID
   * @returns 费用明细JSON
   */
  async callCalculateDeliveryFee(orderId: string): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM sp_calculate_delivery_fee(${orderId})
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * 调用订单统计存储过程
   * @param merchantId 商家ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计结果JSON
   */
  async callGetOrderStatistics(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM sp_get_order_statistics(${merchantId}, ${startDate}, ${endDate})
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * 调用配送员自动分配存储过程
   * @param orderId 订单ID
   * @returns 分配的配送员ID
   */
  async callAssignDeliveryDriver(orderId: string): Promise<string | null> {
    const result = await this.$queryRaw<Array<{ sp_assign_delivery_driver: string | null }>>`
      SELECT sp_assign_delivery_driver(${orderId}) as sp_assign_delivery_driver
    `;
    return result.length > 0 ? result[0].sp_assign_delivery_driver : null;
  }

  /**
   * 调用订单状态更新存储过程
   * @param orderId 订单ID
   * @param newStatus 新状态
   * @returns 是否成功
   */
  async callUpdateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
    const result = await this.$queryRaw<Array<{ sp_update_order_status: boolean }>>`
      SELECT sp_update_order_status(${orderId}, ${newStatus}::text) as sp_update_order_status
    `;
    return result.length > 0 ? result[0].sp_update_order_status : false;
  }

  /**
   * 调用费用结算存储过程
   * @param merchantId 商家ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 结算单信息JSON
   */
  async callSettleFees(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM sp_settle_fees(${merchantId}, ${startDate}::timestamp, ${endDate}::timestamp)
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * 调用配送员排班存储过程
   * @param driverId 配送员ID
   * @param workDate 工作日期
   * @param shiftType 班次类型
   * @returns 排班信息JSON
   */
  async callAssignDriverSchedule(
    driverId: string,
    workDate: Date,
    shiftType: string,
  ): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM sp_assign_driver_schedule(${driverId}, ${workDate}::date, ${shiftType})
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * 调用车辆维修提醒存储过程
   * @returns 需要维修的车辆列表JSON
   */
  async callCheckVehicleMaintenance(): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM sp_check_vehicle_maintenance()
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  // ========== 视图查询方法 ==========

  /**
   * 查询商家订单汇总视图
   * @param merchantId 商家ID
   * @returns 订单汇总信息
   */
  async queryMerchantOrderSummary(merchantId: string): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM v_merchant_order_summary WHERE merchant_id = ${merchantId}
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * 查询配送员绩效视图
   * @param driverId 配送员ID（可选）
   * @returns 配送员绩效信息列表
   */
  async queryDeliveryDriverPerformance(driverId?: string): Promise<any[]> {
    if (driverId) {
      const result = await this.$queryRaw`
        SELECT * FROM v_delivery_driver_performance WHERE driver_id = ${driverId}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_delivery_driver_performance ORDER BY completed_orders DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }

  /**
   * 查询仓库库存视图
   * @param warehouseId 仓库ID（可选）
   * @returns 仓库库存信息列表
   */
  async queryWarehouseInventory(warehouseId?: string): Promise<any[]> {
    if (warehouseId) {
      const result = await this.$queryRaw`
        SELECT * FROM v_warehouse_inventory WHERE warehouse_id = ${warehouseId}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_warehouse_inventory ORDER BY stock_usage_rate DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }

  /**
   * 查询订单追踪详情视图
   * @param orderId 订单ID
   * @returns 订单追踪详情
   */
  async queryOrderTrackingDetail(orderId: string): Promise<any> {
    const result = await this.$queryRaw`
      SELECT * FROM v_order_tracking_detail WHERE order_id = ${orderId}
    `;
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  /**
   * 查询物流公司统计视图
   * @param companyName 物流公司名称（可选）
   * @returns 物流公司统计信息列表
   */
  async queryLogisticsCompanyStatistics(companyName?: string): Promise<any[]> {
    if (companyName) {
      const result = await this.$queryRaw`
        SELECT * FROM v_logistics_company_statistics WHERE logistics_company_name = ${companyName}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_logistics_company_statistics ORDER BY total_orders DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }

  /**
   * 查询客户订单汇总视图
   * @param customerId 客户ID（可选）
   * @returns 客户订单汇总信息列表
   */
  async queryCustomerOrderSummary(customerId?: string): Promise<any[]> {
    if (customerId) {
      const result = await this.$queryRaw`
        SELECT * FROM v_customer_order_summary WHERE customer_id = ${customerId}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_customer_order_summary ORDER BY total_orders DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }

  /**
   * 查询费用结算明细视图
   * @param settlementId 结算单ID（可选）
   * @returns 费用结算明细信息列表
   */
  async queryFeeSettlementDetail(settlementId?: string): Promise<any[]> {
    if (settlementId) {
      const result = await this.$queryRaw`
        SELECT * FROM v_fee_settlement_detail WHERE settlement_id = ${settlementId}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_fee_settlement_detail ORDER BY settlement_created_at DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }

  /**
   * 查询配送员排班视图
   * @param driverId 配送员ID（可选）
   * @returns 配送员排班信息列表
   */
  async queryDriverScheduleSummary(driverId?: string): Promise<any[]> {
    if (driverId) {
      const result = await this.$queryRaw`
        SELECT * FROM v_driver_schedule_summary WHERE driver_id = ${driverId}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_driver_schedule_summary ORDER BY scheduled_days DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }

  /**
   * 查询仓库运营统计视图
   * @param warehouseId 仓库ID（可选）
   * @returns 仓库运营统计信息列表
   */
  async queryWarehouseOperationStats(warehouseId?: string): Promise<any[]> {
    if (warehouseId) {
      const result = await this.$queryRaw`
        SELECT * FROM v_warehouse_operation_stats WHERE warehouse_id = ${warehouseId}
      `;
      return Array.isArray(result) ? result : [];
    } else {
      const result = await this.$queryRaw`
        SELECT * FROM v_warehouse_operation_stats ORDER BY stock_usage_rate DESC
      `;
      return Array.isArray(result) ? result : [];
    }
  }
}

