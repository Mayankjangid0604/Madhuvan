const cron = require('node-cron');
const db = require('../config/db.sqlite');

/**
 * Delete students who left more than 1 month ago
 * Runs daily at 3 AM
 */
exports.startCleanupCron = () => {
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('🧹 Running student cleanup job...');
      
      // Calculate date 1 month ago
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const cutoffDate = oneMonthAgo.toISOString().split('T')[0];
      
      // Find students to delete
      const [studentsToDelete] = await db.query(
        `SELECT student_id, student_name, date_of_leaving 
         FROM students 
         WHERE date_of_leaving IS NOT NULL 
         AND date_of_leaving <= ?`,
        [cutoffDate]
      );
      
      if (studentsToDelete.length === 0) {
        console.log('  ℹ️  No students to cleanup');
        return;
      }
      
      console.log(`  🗑️  Deleting ${studentsToDelete.length} old student records...`);
      
      for (const student of studentsToDelete) {
        // Delete student (CASCADE will handle related records)
        await db.query(
          `DELETE FROM students WHERE student_id = ?`,
          [student.student_id]
        );
        
        console.log(`    ✅ Deleted: ${student.student_name} (left on ${student.date_of_leaving})`);
      }
      
      console.log('✅ Cleanup completed successfully');
    } catch (error) {
      console.error('❌ Cleanup cron error:', error.message);
    }
  });
  
  console.log('🧹 Cleanup cron job scheduled (daily at 3 AM)');
};