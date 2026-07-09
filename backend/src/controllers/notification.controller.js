const { query } = require("../config/db.sqlite");
const notificationService = require("../services/notification.service");

exports.sendManualReminder = async (req, res) => {
  try {
    const { student_ids, message_type, custom_message } = req.body;

    if (!student_ids || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No students selected"
      });
    }

    // Get student details - query is synchronous
    const placeholders = student_ids.map(() => '?').join(',');
    const [students] = query(
      `SELECT student_id, student_name, father_mobile, mother_mobile
       FROM students
       WHERE student_id IN (${placeholders})`,
      student_ids
    );

    let sentCount = 0;
    const results = [];

    for (const student of students) {
      const mobile = student.father_mobile || student.mother_mobile;
      
      if (mobile) {
        // notificationService.sendSMS might be async, keep await here
        const result = await notificationService.sendSMS(
          mobile,
          custom_message || `Reminder for ${student.student_name}: Please clear pending fees.`
        );
        
        if (result.success) sentCount++;
        results.push({ student_id: student.student_id, ...result });
      }
    }

    res.json({
      success: true,
      message: `Sent ${sentCount}/${students.length} reminders`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getNotificationLogs = async (req, res) => {
  try {
    const logs = await notificationService.getNotificationLogs(req.query);
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;