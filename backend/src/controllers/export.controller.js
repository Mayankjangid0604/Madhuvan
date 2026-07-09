const exportService = require("../services/export.service");

// Helper to merge query params and body
const getFilters = (req) => {
  return {
    ...req.query,
    ...(req.body?.filters || {}),
    columns: req.body?.columns
  };
};

// LEDGER EXPORTS
exports.exportLedgerCSV = async (req, res, next) => {
  try {
    const csv = await exportService.getLedgerCSV(getFilters(req));
    res.header("Content-Type", "text/csv");
    res.attachment(`ledger_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportLedgerExcel = async (req, res, next) => {
  try {
    const buffer = await exportService.getLedgerExcel(getFilters(req));
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment(`ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// FEE EXPORTS
exports.exportFeesCSV = async (req, res, next) => {
  try {
    const csv = await exportService.getFeesCSV(getFilters(req));
    res.header("Content-Type", "text/csv");
    res.attachment(`fees_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportFeesExcel = async (req, res, next) => {
  try {
    const buffer = await exportService.getFeesExcel(getFilters(req));
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment(`fees_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// STUDENT EXPORTS
exports.exportStudentsCSV = async (req, res, next) => {
  try {
    const csv = await exportService.getStudentsCSV(getFilters(req));
    res.header("Content-Type", "text/csv");
    res.attachment(`students_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportStudentsExcel = async (req, res, next) => {
  try {
    const buffer = await exportService.getStudentsExcel(getFilters(req));
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment(`students_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// OCCUPANCY EXPORTS
exports.exportOccupancyCSV = async (req, res, next) => {
  try {
    const csv = await exportService.getOccupancyCSV(getFilters(req));
    res.header("Content-Type", "text/csv");
    res.attachment(`occupancy_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportOccupancyExcel = async (req, res, next) => {
  try {
    const buffer = await exportService.getOccupancyExcel(getFilters(req));
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment(`occupancy_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// STUDENT LEDGER
exports.exportStudentLedgerCSV = async (req, res, next) => {
  try {
    const csv = await exportService.getStudentLedgerCSV(req.params.studentId);
    res.header("Content-Type", "text/csv");
    res.attachment(`student_${req.params.studentId}_ledger.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// GST REPORT (online-payment fee collections only)
exports.exportGstReport = async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    const data = await exportService.getGstReport({ from_date, to_date });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// CUSTOM REPORT
exports.exportCustomReport = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.body;
    const result = await exportService.getCustomReport(req.body);
    
    if (format === 'csv') {
      res.header("Content-Type", "text/csv");
      res.attachment(`custom_report_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.attachment(`custom_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    
    res.send(result);
  } catch (error) {
    next(error);
  }
};