const dashboardService = require("../services/dashboard.service");

exports.getDashboardSummary = (req, res, next) => {
  try {
    const data = dashboardService.getDashboardSummary();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    next(error);
  }
};

exports.getMonthlyCollection = (req, res, next) => {
  try {
    const data = dashboardService.getMonthlyCollection();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Monthly Collection Error:', error);
    next(error);
  }
};

exports.getRecentAdmissions = (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = dashboardService.getRecentAdmissions(limit);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Recent Admissions Error:', error);
    next(error);
  }
};

exports.getRecentCheckouts = (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = dashboardService.getRecentCheckouts(limit);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Recent Checkouts Error:', error);
    next(error);
  }
};

exports.getOverdueAlerts = (req, res, next) => {
  try {
    const data = dashboardService.getOverdueAlerts();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Overdue Alerts Error:', error);
    next(error);
  }
};

exports.getRoomOccupancy = (req, res, next) => {
  try {
    const data = dashboardService.getRoomOccupancyByType();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Room Occupancy Error:', error);
    next(error);
  }
};

module.exports = exports;
