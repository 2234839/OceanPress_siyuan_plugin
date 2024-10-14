let taskID: any[] = [];
export function scheduleCronJob(cronExpression: string, taskFunction: () => void) {
  /** 过滤不可见字符，避免用户输入看似正确的表达式但实际程序无法匹配，正则表达式来源于 gpt 未经广泛的验证 */
  cronExpression = cronExpression.replace(/[\u200B-\u200D\uFEFF]/g, "");
  const cronParts = cronExpression.split(" ");

  if (cronParts.length < 5) {
    throw new Error("Invalid Cron expression");
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;

  function checkAndRunTask() {
    const currentDate = new Date();
    const currentMinute = currentDate.getMinutes().toString();
    const currentHour = currentDate.getHours().toString();
    const currentDayOfMonth = currentDate.getDate().toString();
    const currentMonth = (currentDate.getMonth() + 1).toString();
    const currentDayOfWeek = (currentDate.getDay() + 1).toString();

    if (
      checkField(minute, currentMinute) &&
      checkField(hour, currentHour) &&
      checkField(dayOfMonth, currentDayOfMonth) &&
      checkField(month, currentMonth) &&
      checkField(dayOfWeek, currentDayOfWeek)
    ) {
      taskFunction();
    }
  }

  function checkField(fieldValue: string, currentValue: string) {
    return fieldValue === "*" || fieldValue.includes(currentValue);
  }
  const id = setInterval(checkAndRunTask, 60_000); // 每分钟检查一次
  taskID.push(id);
}
export function removeAllCronJob() {
  console.log(`移除所有定时任务,数量:${taskID.length}`);

  taskID.forEach((id) => clearInterval(id));
  taskID = [];
}