import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "Family Calendar",
      nav: {
        dashboard: "Dashboard",
        calendar: "Calendar",
        habits: "Habits",
        media: "Daily Log",
        settings: "Settings"
      },
      dashboard: {
        title: "Today",
        empty: "No items yet."
      },
      calendar: {
        title: "Family Calendar",
        addEvent: "Add Event"
      },
      habits: {
        title: "Habits",
        addHabit: "Add Habit"
      },
      media: {
        title: "Daily Log",
        addMedia: "Add Photo/Video",
        note: "Note"
      },
      settings: {
        title: "Settings",
        language: "Language",
        save: "Save"
      },
      auth: {
        title: "Household Login",
        username: "Username",
        password: "Password",
        signIn: "Sign In",
        error: "Invalid username or password."
      },
      common: {
        member: "Member",
        title: "Title",
        start: "Start",
        end: "End",
        note: "Note",
        date: "Date",
        type: "Type",
        file: "File",
        name: "Name",
        frequency: "Frequency",
        habit: "Habit",
        status: "Status",
        select: "Select",
        all: "All",
        done: "Done",
        skip: "Skip"
      },
      events: {
        edit: "Edit",
        save: "Save",
        delete: "Delete",
        deleteOne: "Delete this day",
        deleteSeries: "Delete series",
        deleteChoose: "Delete options",
        repeat: "Repeat",
        never: "Never",
        everyDay: "Every day",
        everyWeek: "Every week",
        everyTwoWeeks: "Every 2 weeks",
        everyMonth: "Every month",
        everyYear: "Every year",
        custom: "Custom",
        frequency: "Frequency",
        interval: "Every",
        repeatUntil: "Repeat Until",
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        yearly: "Yearly",
        dayUnit: "days",
        weekUnit: "weeks",
        monthUnit: "months",
        yearUnit: "years",
        untilShort: "until"
      },
      calendarMonth: {
        prev: "Previous",
        next: "Next",
        today: "Today",
        back: "Back to Month",
        emptyDay: "No events for this day."
      },
      members: {
        title: "Family Members",
        addMember: "Add Member",
        avatar: "Avatar",
        openCamera: "Open Camera",
        capture: "Capture",
        cancel: "Cancel",
        cameraError: "Camera access is not available.",
        edit: "Edit",
        save: "Save",
        updateAvatar: "Update Avatar",
        delete: "Delete",
        deletePrompt: "Enter household password to delete this member.",
        deleteFailed: "Delete failed. Check the password."
      }
    }
  },
  zh: {
    translation: {
      appName: "家庭日历",
      nav: {
        dashboard: "今天",
        calendar: "日历",
        habits: "习惯",
        media: "每日记录",
        settings: "设置"
      },
      dashboard: {
        title: "今日",
        empty: "还没有记录。"
      },
      calendar: {
        title: "家庭日历",
        addEvent: "添加事件"
      },
      habits: {
        title: "习惯",
        addHabit: "添加习惯"
      },
      media: {
        title: "每日记录",
        addMedia: "添加照片/视频",
        note: "备注"
      },
      settings: {
        title: "设置",
        language: "语言",
        save: "保存"
      },
      auth: {
        title: "家庭登录",
        username: "用户名",
        password: "密码",
        signIn: "登录",
        error: "用户名或密码不正确。"
      },
      common: {
        member: "成员",
        title: "标题",
        start: "开始",
        end: "结束",
        note: "备注",
        date: "日期",
        type: "类型",
        file: "文件",
        name: "名称",
        frequency: "频率",
        habit: "习惯",
        status: "状态",
        select: "选择",
        all: "全部",
        done: "完成",
        skip: "跳过"
      },
      events: {
        edit: "编辑",
        save: "保存",
        delete: "删除",
        deleteOne: "删除当天",
        deleteSeries: "删除整个事件",
        deleteChoose: "删除选项",
        repeat: "重复",
        never: "不重复",
        everyDay: "每天",
        everyWeek: "每周",
        everyTwoWeeks: "每两周",
        everyMonth: "每月",
        everyYear: "每年",
        custom: "自定义",
        frequency: "频率",
        interval: "每隔",
        repeatUntil: "重复到",
        daily: "每天",
        weekly: "每周",
        monthly: "每月",
        yearly: "每年",
        dayUnit: "天",
        weekUnit: "周",
        monthUnit: "个月",
        yearUnit: "年",
        untilShort: "到"
      },
      calendarMonth: {
        prev: "上个月",
        next: "下个月",
        today: "今天",
        back: "返回月视图",
        emptyDay: "这一天还没有事件。"
      },
      members: {
        title: "家庭成员",
        addMember: "添加成员",
        avatar: "头像",
        openCamera: "打开摄像头",
        capture: "拍照",
        cancel: "取消",
        cameraError: "无法访问摄像头。",
        edit: "编辑",
        save: "保存",
        updateAvatar: "更新头像",
        delete: "删除",
        deletePrompt: "请输入家庭密码以删除该成员。",
        deleteFailed: "删除失败，请检查密码。"
      }
    }
  }
};

const savedLanguage = localStorage.getItem("language") || "en";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export const setLanguage = (lang) => {
  i18n.changeLanguage(lang);
  localStorage.setItem("language", lang);
};

export default i18n;
