import { UserProfileModel, type SubjectMastery } from "../models/UserProfileDoc.js";

export async function incrementSubjectMastery(userId: string, subject: string, hours: number) {
  try {
    const profile = await UserProfileModel.findOne({ user_id: userId });
    if (!profile) return;

    let index = profile.subjectMastery.findIndex(s => s.subject === subject);
    
    if (index === -1) {
      profile.subjectMastery.push({
        subject,
        hoursStudied: 0,
        tasksCompleted: 0,
        currentLevel: 1,
      });
      index = profile.subjectMastery.length - 1;
    }

    const mastery = profile.subjectMastery[index];
    mastery.hoursStudied += hours;
    mastery.tasksCompleted += 1;

    // Simple level curve: 1 level per 2 tasks or 3 hours
    const levelFromTasks = Math.floor(mastery.tasksCompleted / 2);
    const levelFromHours = Math.floor(mastery.hoursStudied / 3);
    mastery.currentLevel = 1 + levelFromTasks + levelFromHours;

    profile.markModified('subjectMastery');
    await profile.save();
  } catch (e) {
    console.error("Failed to increment subject mastery", e);
  }
}
