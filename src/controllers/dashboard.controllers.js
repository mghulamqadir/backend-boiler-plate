import { errorResponse, successResponse } from '../utils/response.handler.js';
import * as dashboardService from '../services/dashboard.services.js';

export async function creatorDashboard(req, res) {
  try {
    const userId = req.user._id;
    const period = req.query.period;
    const chartPeriod = req.query.chartPeriod;
    const dashboard = await dashboardService.creatorDashboard(userId, period, chartPeriod);
    return successResponse(
      res,
      200,
      'Creator Dashboard retrieved successfully',
      dashboard,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function brandDashboard(req, res) {
   try {
    const userId = req.user._id;
    const chartPeriod = req.query.chartPeriod;
    const dashboard = await dashboardService.brandDashboard(userId, chartPeriod);
    return successResponse(
      res,
      200,
      'Brand Dashboard retrieved successfully',
      dashboard,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}
