import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  Wallet, 
  Plus, 
  X, 
  Edit, 
  Trash2,
  Phone,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle,
  PlayCircle,
  Sparkles,
  Cloud,
  CloudOff,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Repeat,
  Bot,
  Loader2
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase Init
let app, auth, db, appId;
try {
  const rawConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
  const firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
  
  if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// Дни недели для помощника (0 - Воскресенье, 1 - Понедельник и т.д. по стандарту JS)
const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAY_INDEXES = [1, 2, 3, 4, 5, 6, 0]; // Порядок для кнопок: Пн-Вс

// --- ПОДГОТОВКА ТЕСТОВЫХ ДАННЫХ ---
const todayObj = new Date();
const currentDay = todayObj.getDay() || 7; 
const getDayDate = (target) => { 
  const d = new Date(todayObj); 
  d.setDate(todayObj.getDate() - currentDay + target); 
  return d.toISOString().split('T')[0]; 
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Функция АВТО-ЗАВЕРШЕНИЯ уроков
const runAutoCompletion = (currentLessons, currentStudents, currentGroups, currentTransactions) => {
  let updated = false;
  const now = new Date();
  let newLessons = [...currentLessons];
  let newStudents = [...currentStudents];
  let newTransactions = [...currentTransactions];

  newLessons = newLessons.map(lesson => {
      // Считаем урок "прошедшим" через 1 час после начала
      const lessonEndTime = new Date(`${lesson.date}T${lesson.time}`);
      lessonEndTime.setHours(lessonEndTime.getHours() + 1);

      if (lesson.status === 'planned' && lessonEndTime <= now) {
          updated = true;
          const group = lesson.type === 'group' ? currentGroups.find(g => g.id === lesson.targetId) : null;
          const lessonStudents = lesson.type === 'individual' 
              ? [newStudents.find(s => s.id === lesson.targetId)].filter(Boolean) 
              : (group?.studentIds?.map(id => newStudents.find(s => s.id === id)).filter(Boolean) || []);
          
          const attendance = {};
          lessonStudents.forEach(s => {
              attendance[s.id] = true;
              const finalRate = group?.rateOverrides?.[s.id] !== undefined ? group.rateOverrides[s.id] : s.rate;
              
              newTransactions.push({
                  id: Date.now() + Math.random(),
                  studentId: s.id,
                  type: 'charge',
                  amount: finalRate,
                  date: getTodayDate(),
                  comment: `Авто-списание: Занятие ${new Date(lesson.date).toLocaleDateString('ru-RU')}`,
                  lessonId: lesson.id
              });
              
              const sIndex = newStudents.findIndex(st => st.id === s.id);
              if(sIndex > -1) {
                  newStudents[sIndex] = { ...newStudents[sIndex], balance: newStudents[sIndex].balance - finalRate };
              }
          });

          return { ...lesson, status: 'completed', attendance };
      }
      return lesson;
  });

  return updated ? { newLessons, newStudents, newTransactions } : null;
};

// Обнуляем всем баланс до 0
const mockStudents = [
  { id: 1, name: 'Вика', rate: 1300, phone: '+7 (900) 001', balance: 0 },
  { id: 2, name: 'Алиса', rate: 1300, phone: '+7 (900) 002', balance: 0 },
  { id: 3, name: 'Султан', rate: 1500, phone: '+7 (900) 003', balance: 0 },
  { id: 4, name: 'Али', rate: 1500, phone: '+7 (900) 004', balance: 0 },
  { id: 5, name: 'Андрей', rate: 1100, phone: '+7 (900) 005', balance: 0 },
  { id: 6, name: 'Илья', rate: 1100, phone: '+7 (900) 006', balance: 0 },
  { id: 7, name: 'Кирилл', rate: 1500, phone: '+7 (900) 007', balance: 0 },
  { id: 8, name: 'Ярослав', rate: 1500, phone: '+7 (900) 008', balance: 0 },
  { id: 9, name: 'Миша', rate: 1500, phone: '+7 (900) 009', balance: 0 },
  { id: 10, name: 'Полина', rate: 1300, phone: '+7 (900) 010', balance: 0 },
  { id: 11, name: 'Яна', rate: 1300, phone: '+7 (900) 011', balance: 0 },
  { id: 12, name: 'Ирина', rate: 1100, phone: '+7 (900) 012', balance: 0 },
  { id: 13, name: 'София', rate: 1000, phone: '+7 (900) 013', balance: 0 },
  { id: 14, name: 'Временной', rate: 1000, phone: '+7 (900) 014', balance: 0 },
  { id: 15, name: 'Марк', rate: 1300, phone: '+7 (900) 015', balance: 0 },
  { id: 16, name: 'Анатолий', rate: 1300, phone: '+7 (900) 016', balance: 0 }
];

const mockGroups = [
  { id: 1, name: 'История 10 кл (Вика, Алиса)', studentIds: [1, 2] },
  { id: 2, name: 'История 10 кл (Султан, Али)', studentIds: [3, 4] },
  { id: 3, name: 'Общество 10 кл (Султан, Андрей, Илья)', studentIds: [3, 5, 6], rateOverrides: { 3: 1100 } },
  { id: 4, name: 'Общество 11 кл (Кирилл, Ярослав, Миша)', studentIds: [7, 8, 9] },
  { id: 5, name: 'Общество 11 кл (Полина, Яна)', studentIds: [10, 11] },
  { id: 6, name: 'История 10 кл (Андрей, Ирина, Илья)', studentIds: [5, 12, 6] },
  { id: 7, name: 'Общество 9 кл (София, Временной)', studentIds: [13, 14] },
  { id: 8, name: 'Общество 10 кл (Марк, Анатолий, Ирина)', studentIds: [15, 16, 12] }, // У Ирины базовая 1100, у Марка 1300
  { id: 9, name: 'История (Полина, Ярослав, Кирилл)', studentIds: [10, 8, 7], rateOverrides: { 10: 600, 8: 1300, 7: 1300 } }
];

// Очищаем старые транзакции, чтобы начать с чистого листа
const mockTransactions = [];

const mockLessons = [];
let lId = 1;

// Генерируем расписание на 12 недель (около 3 месяцев) вперед
for (let week = 0; week < 12; week++) {
  const daysOffset = week * 7;
  
  // Пн и Чт
  [getDayDate(1 + daysOffset), getDayDate(4 + daysOffset)].forEach(date => {
    const isPast = date < getTodayDate();
    mockLessons.push({ id: lId++, type: 'group', targetId: 1, date, time: '15:00', status: isPast ? 'completed' : 'planned' });
    mockLessons.push({ id: lId++, type: 'group', targetId: 2, date, time: '18:00', status: isPast ? 'completed' : 'planned' });
    mockLessons.push({ id: lId++, type: 'group', targetId: 3, date, time: '16:30', status: isPast ? 'completed' : 'planned' });
  });

  // Вт и Пт
  [getDayDate(2 + daysOffset), getDayDate(5 + daysOffset)].forEach(date => {
    const isPast = date < getTodayDate();
    mockLessons.push({ id: lId++, type: 'group', targetId: 4, date, time: '18:00', status: isPast ? 'completed' : 'planned' });
    mockLessons.push({ id: lId++, type: 'group', targetId: 5, date, time: '15:00', status: isPast ? 'completed' : 'planned' });
    mockLessons.push({ id: lId++, type: 'group', targetId: 6, date, time: '16:30', status: isPast ? 'completed' : 'planned' });
  });

  // Ср и Сб
  [getDayDate(3 + daysOffset), getDayDate(6 + daysOffset)].forEach(date => {
    const isPast = date < getTodayDate();
    mockLessons.push({ id: lId++, type: 'group', targetId: 7, date, time: '16:30', status: isPast ? 'completed' : 'planned' });
    mockLessons.push({ id: lId++, type: 'group', targetId: 8, date, time: '15:00', status: isPast ? 'completed' : 'planned' });
    mockLessons.push({ id: lId++, type: 'group', targetId: 9, date, time: '18:00', status: isPast ? 'completed' : 'planned' });
  });
}

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // UX States
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);

  // Данные
  const [students, setStudents] = useState(mockStudents);
  const [groups, setGroups] = useState(mockGroups);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [lessons, setLessons] = useState(mockLessons);

  // Управление модальными окнами
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonModalDate, setLessonModalDate] = useState(getTodayDate());
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Календарь
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  // Аналитика
  const [analyticsPeriod, setAnalyticsPeriod] = useState('current_month');

  // Состояние ИИ-ассистента
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- FIREBASE EFFECTS ---
  React.useEffect(() => {
    if (!auth) {
      const autoRes = runAutoCompletion(mockLessons, mockStudents, mockGroups, mockTransactions);
      if (autoRes) {
          setLessons(autoRes.newLessons);
          setStudents(autoRes.newStudents);
          setTransactions(autoRes.newTransactions);
          setGroups(mockGroups);
      } else {
          setStudents(mockStudents);
          setGroups(mockGroups);
          setLessons(mockLessons);
          setTransactions(mockTransactions);
      }
      setIsLoaded(true);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error", e);
        // Если ошибка авторизации, все равно разрешаем загрузку (будут мок-данные)
        setIsLoaded(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsLoaded(true); // Если разлогинились или не вошли, разрешаем показ (мок-данные)
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user || !db) return;
    const loadData = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tutorData', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().students && docSnap.data().students.length > 1) {
          const data = docSnap.data();
          const autoRes = runAutoCompletion(data.lessons || [], data.students || [], data.groups || [], data.transactions || []);
          if (autoRes) {
              setLessons(autoRes.newLessons);
              setStudents(autoRes.newStudents);
              setTransactions(autoRes.newTransactions);
              setGroups(data.groups || []);
          } else {
              setStudents(data.students || []);
              setGroups(data.groups || []);
              setLessons(data.lessons || []);
              setTransactions(data.transactions || []);
          }
        } else {
          const autoRes = runAutoCompletion(mockLessons, mockStudents, mockGroups, mockTransactions);
          if (autoRes) {
              setLessons(autoRes.newLessons);
              setStudents(autoRes.newStudents);
              setTransactions(autoRes.newTransactions);
              setGroups(mockGroups);
          } else {
              setStudents(mockStudents);
              setGroups(mockGroups);
              setLessons(mockLessons);
              setTransactions(mockTransactions);
          }
        }
      } catch (e) {
        console.error("Load error", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, [user]);

  React.useEffect(() => {
    if (!user || !isLoaded || !db) return;
    const saveData = async () => {
      setSyncStatus('syncing');
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tutorData', 'main'), {
          students, groups, lessons, transactions
        });
        setSyncStatus('saved');
      } catch (e) {
        setSyncStatus('offline');
      }
    };
    const timeoutId = setTimeout(saveData, 1500);
    return () => clearTimeout(timeoutId);
  }, [students, groups, lessons, transactions, user, isLoaded]);
  
  // --- HANDLERS ---
  const handleSaveStudent = (studentData) => {
    if (editingStudent) {
      setStudents(students.map(s => s.id === editingStudent.id ? { ...s, ...studentData } : s));
    } else {
      setStudents([...students, { ...studentData, id: Date.now(), balance: 0 }]);
    }
    setIsStudentModalOpen(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (id) => {
    if(confirm('Вы уверены, что хотите удалить ученика?')) {
      setStudents(students.filter(s => s.id !== id));
      setGroups(groups.map(g => ({ ...g, studentIds: g.studentIds.filter(sId => sId !== id) })));
    }
  };

  const handleSaveGroup = (groupData) => {
    setGroups([...groups, { ...groupData, id: Date.now() }]);
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (id) => {
    if(confirm('Удалить группу?')) {
      setGroups(groups.filter(g => g.id !== id));
    }
  };

  const handleSaveTransaction = (txData) => {
    const newTx = { ...txData, id: Date.now() };
    setTransactions([newTx, ...transactions]);
    setStudents(students.map(s => {
      if (s.id === txData.studentId) {
        const amountChange = txData.type === 'payment' ? Number(txData.amount) : -Number(txData.amount);
        return { ...s, balance: s.balance + amountChange };
      }
      return s;
    }));
    setIsTransactionModalOpen(false);
  };

  const handleSaveLesson = (lessonData, editId = null) => {
    if (editId) {
      setLessons(lessons.map(l => l.id === editId ? { ...l, ...lessonData[0] } : l));
    } else {
      const lessonsToAdd = Array.isArray(lessonData) ? lessonData : [lessonData];
      const newLessons = lessonsToAdd.map((l, i) => ({ ...l, id: Date.now() + i, status: 'planned' }));
      setLessons([...lessons, ...newLessons]);
    }
    setIsLessonModalOpen(false);
    setEditingLesson(null);
  };

  const handleDeleteLesson = (id, e) => {
    if (e) e.stopPropagation(); 
    if(confirm('Удалить занятие? Если оно было проведено, деньги автоматически вернутся на баланс учеников.')) {
      const lesson = lessons.find(l => l.id === id);
      
      // Возвращаем деньги, если урок уже был проведен (или авто-проведен)
      if (lesson && lesson.status === 'completed') {
          const group = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId) : null;
          const newTransactions = [];
          const studentUpdates = {};
          
          Object.entries(lesson.attendance || {}).forEach(([sIdStr, isPresent]) => {
              if (isPresent) {
                  const sId = Number(sIdStr);
                  const student = students.find(s => s.id === sId);
                  if (student) {
                      const finalRate = group?.rateOverrides?.[sId] !== undefined ? group.rateOverrides[sId] : student.rate;
                      newTransactions.push({
                          id: Date.now() + Math.random(),
                          studentId: sId,
                          type: 'payment', // Возврат как пополнение
                          amount: finalRate,
                          date: getTodayDate(),
                          comment: `Отмена занятия: ${new Date(lesson.date).toLocaleDateString('ru-RU')}`,
                          lessonId: lesson.id
                      });
                      studentUpdates[sId] = (studentUpdates[sId] || 0) + finalRate;
                  }
              }
          });
          if (newTransactions.length > 0) {
              setTransactions(prev => [...newTransactions, ...prev]);
              setStudents(prev => prev.map(s => studentUpdates[s.id] !== undefined ? { ...s, balance: s.balance + studentUpdates[s.id] } : s));
          }
      }
      setLessons(lessons.filter(l => l.id !== id));
    }
  };

  const openLessonModal = (dateStr, lesson = null) => {
    setLessonModalDate(dateStr || getTodayDate());
    setEditingLesson(lesson);
    setIsLessonModalOpen(true);
  };

  // УМНОЕ ИЗМЕНЕНИЕ ПОСЕЩАЕМОСТИ
  const handleSaveAttendance = (lessonId, newAttendance) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const group = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId) : null;
    const newTransactions = [];
    const studentUpdates = {};

    const lessonStudents = lesson.type === 'individual' 
        ? [students.find(s => s.id === lesson.targetId)].filter(Boolean) 
        : (group?.studentIds.map(id => students.find(s => s.id === id)).filter(Boolean) || []);

    if (lesson.status === 'planned') {
        // Проводим урок вручную в первый раз
        lessonStudents.forEach(student => {
            if (newAttendance[student.id]) {
                const finalRate = group?.rateOverrides?.[student.id] !== undefined ? group.rateOverrides[student.id] : student.rate;
                newTransactions.push({
                    id: Date.now() + Math.random(),
                    studentId: student.id,
                    type: 'charge',
                    amount: finalRate,
                    date: getTodayDate(),
                    comment: `Списание: Занятие ${new Date(lesson.date).toLocaleDateString('ru-RU')}`,
                    lessonId: lesson.id
                });
                studentUpdates[student.id] = (studentUpdates[student.id] || 0) - finalRate;
            }
        });
    } else {
        // Редактируем уже проведенный (или авто-завершенный) урок
        const oldAttendance = lesson.attendance || {};
        lessonStudents.forEach(student => {
            const sId = student.id;
            const wasPresent = !!oldAttendance[sId];
            const isPresent = !!newAttendance[sId];

            if (wasPresent !== isPresent) {
                const finalRate = group?.rateOverrides?.[sId] !== undefined ? group.rateOverrides[sId] : student.rate;
                if (wasPresent && !isPresent) {
                    // Теперь отсутствует -> Возвращаем деньги
                    newTransactions.push({
                        id: Date.now() + Math.random(),
                        studentId: sId,
                        type: 'payment',
                        amount: finalRate,
                        date: getTodayDate(),
                        comment: `Возврат (отсутствовал): Занятие ${new Date(lesson.date).toLocaleDateString('ru-RU')}`,
                        lessonId: lesson.id
                    });
                    studentUpdates[sId] = (studentUpdates[sId] || 0) + finalRate;
                } else if (!wasPresent && isPresent) {
                    // Теперь присутствует -> Списываем деньги
                    newTransactions.push({
                        id: Date.now() + Math.random(),
                        studentId: sId,
                        type: 'charge', 
                        amount: finalRate,
                        date: getTodayDate(),
                        comment: `Списание (присутствовал): Занятие ${new Date(lesson.date).toLocaleDateString('ru-RU')}`,
                        lessonId: lesson.id
                    });
                    studentUpdates[sId] = (studentUpdates[sId] || 0) - finalRate;
                }
            }
        });
    }

    if (newTransactions.length > 0) {
        setTransactions(prev => [...newTransactions, ...prev]);
        setStudents(prev => prev.map(s => studentUpdates[s.id] !== undefined ? { ...s, balance: s.balance + studentUpdates[s.id] } : s));
    }

    setLessons(prev => prev.map(l => 
        l.id === lessonId ? { ...l, status: 'completed', attendance: newAttendance } : l
    ));
    setIsAttendanceModalOpen(false);
    setSelectedLesson(null);
  };

  // --- ИИ-АССИСТЕНТ (Магия Gemini) ---
  const handleAIAssistant = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    
    try {
      const apiKey = ""; // Выдастся окружением
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

      const systemPrompt = `Ты ИИ-ассистент репетитора. Пользователь пишет естественным языком, что нужно изменить в расписании.
Текущая дата: ${new Date().toISOString().split('T')[0]}
Студенты: ${JSON.stringify(students.map(s => ({id: s.id, name: s.name})))}
Группы: ${JSON.stringify(groups.map(g => ({id: g.id, name: g.name})))}
Текущие уроки (только ID, тип, цель, дата, время): ${JSON.stringify(lessons.map(l => ({id: l.id, type: l.type, targetId: l.targetId, date: l.date, time: l.time})))}

Определи, какие уроки нужно добавить, изменить или удалить.
ОБЯЗАТЕЛЬНО ВЕРНИ JSON со структурой:
{
  "actions": [
    {
      "type": "ADD_LESSON" | "UPDATE_LESSON" | "DELETE_LESSON",
      "lessonId": 12345, 
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "targetId": 1,
      "lessonType": "group" | "individual"
    }
  ],
  "reply": "Ответ пользователю (Например: 'Урок успешно перенесен на завтра.')"
}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                actions: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      type: { type: "STRING" },
                      lessonId: { type: "NUMBER" },
                      date: { type: "STRING" },
                      time: { type: "STRING" },
                      targetId: { type: "NUMBER" },
                      lessonType: { type: "STRING" }
                    }
                  }
                },
                reply: { type: "STRING" }
              }
            }
          }
        })
      });

      const data = await response.json();
      const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);

      if (parsed.actions && parsed.actions.length > 0) {
        let newLessons = [...lessons];
        parsed.actions.forEach(action => {
          if (action.type === 'DELETE_LESSON' && action.lessonId) {
            newLessons = newLessons.filter(l => l.id !== action.lessonId);
          } else if (action.type === 'UPDATE_LESSON' && action.lessonId) {
            newLessons = newLessons.map(l => l.id === action.lessonId ? { ...l, date: action.date || l.date, time: action.time || l.time } : l);
          } else if (action.type === 'ADD_LESSON' && action.targetId && action.date && action.time) {
            newLessons.push({
              id: Date.now() + Math.random(),
              type: action.lessonType || 'group',
              targetId: action.targetId,
              date: action.date,
              time: action.time,
              status: 'planned'
            });
          }
        });
        setLessons(newLessons);
      }
      setAiPrompt('');
      alert(parsed.reply || "Расписание успешно обновлено ИИ!");
    } catch(err) {
      alert('Ошибка ИИ: Не удалось обработать запрос. Убедитесь, что запрос четкий.');
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- VIEWS ---
  const renderDashboard = () => {
    const totalDebt = students.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);
    const totalPrepaid = students.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);

    // Берем 7 дней (сегодня + 6 дней)
    const next7Days = Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    return (
      <div className="space-y-8">
        {/* Статистика */}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Обзор</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
              <div><p className="text-sm text-gray-500">Учеников</p><p className="text-2xl font-bold">{students.length}</p></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><BookOpen size={24} /></div>
              <div><p className="text-sm text-gray-500">Групп</p><p className="text-2xl font-bold">{groups.length}</p></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg"><ArrowDownCircle size={24} /></div>
              <div><p className="text-sm text-gray-500">Долги</p><p className="text-2xl font-bold text-red-600">{totalDebt} ₽</p></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg"><ArrowUpCircle size={24} /></div>
              <div><p className="text-sm text-gray-500">Предоплаты</p><p className="text-2xl font-bold text-green-600">{totalPrepaid} ₽</p></div>
            </div>
          </div>
        </div>

        {/* Недельное расписание (Компактный вертикальный вид для мобильных) */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="mr-2 text-blue-500" size={24} /> Расписание на неделю
            </h2>
            <button onClick={() => openLessonModal(null)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200 transition">
              + Занятие
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {next7Days.map(dateStr => {
              const dayLessons = lessons.filter(l => l.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
              const isToday = dateStr === getTodayDate();
              const dateObj = new Date(dateStr);
              const dayName = DAYS_OF_WEEK[dateObj.getDay()];
              
              return (
                <div key={dateStr} className={`flex flex-col sm:flex-row bg-white border rounded-xl p-3 shadow-sm gap-3 ${isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100'}`}>
                  {/* Дата слева (или сверху на мобилке) */}
                  <div className="flex justify-between sm:flex-col sm:w-24 shrink-0 sm:border-r border-gray-100 pb-2 sm:pb-0 sm:pr-2 items-center sm:items-start border-b sm:border-b-0">
                    <span className={`font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>{isToday ? 'Сегодня' : dayName}</span>
                    <span className="text-sm text-gray-500">{dateObj.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})}</span>
                  </div>
                  
                  {/* Уроки */}
                  <div className="flex flex-wrap gap-2 flex-1">
                    {dayLessons.length === 0 ? (
                      <span className="text-sm text-gray-400 italic flex items-center">Нет занятий</span>
                    ) : (
                      dayLessons.map(l => {
                        const targetName = l.type === 'group' ? groups.find(g=>g.id===l.targetId)?.name : students.find(s=>s.id===l.targetId)?.name;
                        return (
                          <div 
                            key={l.id} 
                            onClick={() => openLessonModal(l.date, l)} 
                            className={`cursor-pointer border rounded-lg p-2 text-sm flex items-center gap-2 transition w-full sm:w-auto hover:shadow-md ${l.status === 'completed' ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                          >
                            <span className="font-bold text-blue-700 whitespace-nowrap">{l.time}</span>
                            <span className="truncate max-w-[150px] font-medium text-gray-800">{targetName}</span>
                            {l.status === 'planned' && (
                              <button onClick={(e) => { e.stopPropagation(); setSelectedLesson(l); setIsAttendanceModalOpen(true); }} className="ml-auto bg-green-500 text-white p-1 rounded-full hover:bg-green-600 transition" title="Провести вручную">
                                <PlayCircle size={14} />
                              </button>
                            )}
                            {l.status === 'completed' && (
                              <button onClick={(e) => { e.stopPropagation(); setSelectedLesson(l); setIsAttendanceModalOpen(true); }} className="ml-auto bg-gray-100 text-gray-500 hover:text-gray-700 p-1 rounded-full transition" title="Изменить отметки">
                                <CheckCircle size={14} className="text-green-500" />
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderStudents = () => {
    const filteredStudents = students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDebt = showDebtorsOnly ? s.balance < 0 : true;
      return matchesSearch && matchesDebt;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Ученики</h1>
          <button onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition">
            <Plus size={20} className="mr-2" /> Добавить
          </button>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Поиск по имени..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={() => setShowDebtorsOnly(!showDebtorsOnly)} className={`px-4 py-2 rounded-lg flex items-center justify-center transition border ${showDebtorsOnly ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-gray-200 text-gray-600'}`}>
            <Filter size={18} className="mr-2" /> Только должники
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <div key={student.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800">{student.name}</h3>
                <div className="flex space-x-2 text-gray-400">
                  <button onClick={() => { setEditingStudent(student); setIsStudentModalOpen(true); }} className="hover:text-blue-600"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteStudent(student.id)} className="hover:text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center"><Phone size={16} className="mr-2 text-gray-400" /> {student.phone || 'Не указан'}</div>
                <div className="flex items-center"><Wallet size={16} className="mr-2 text-gray-400" /> Ставка: {student.rate} ₽/занятие</div>
                <div className={`mt-4 inline-block px-3 py-1 rounded-full text-xs font-medium ${student.balance < 0 ? 'bg-red-100 text-red-800' : student.balance > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  Баланс: {student.balance} ₽
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGroups = () => { 
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Группы</h1>
          <button onClick={() => setIsGroupModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition"><Plus size={20} className="mr-2" /> Создать группу</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                <button onClick={() => handleDeleteGroup(group.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-2">Состав ({group.studentIds.length}):</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {group.studentIds.map(id => {
                  const student = students.find(s => s.id === id);
                  return student ? <li key={id} className="flex items-center before:content-['•'] before:mr-2 before:text-purple-400">{student.name}</li> : null;
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1;

    const changeMonth = (offset) => setCurrentMonth(new Date(year, month + offset, 1));
    const formatDt = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const selectedDayLessons = lessons.filter(l => l.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));
    const selectedDateObj = new Date(selectedDate);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Расписание</h1>
          <button onClick={() => openLessonModal(selectedDate)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"><Plus size={20} className="mr-2" /> Добавить</button>
        </div>

        {/* ИИ-ПАНЕЛЬ */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row items-center gap-4">
          <div className="bg-white p-2 rounded-full shadow-sm text-indigo-500 shrink-0"><Bot size={24} /></div>
          <div className="flex-1 w-full relative">
            <input 
              type="text" 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Напишите: Перенеси урок 'Общество 9 кл' на завтра на 18:00..."
              className="w-full px-4 py-2.5 rounded-lg border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm shadow-inner transition"
              onKeyDown={(e) => e.key === 'Enter' && handleAIAssistant()}
            />
          </div>
          <button 
            onClick={handleAIAssistant}
            disabled={isAiLoading || !aiPrompt.trim()}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center transition font-medium disabled:opacity-70"
          >
            {isAiLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Sparkles size={18} className="mr-2" />}
            ИИ-Магия
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* КАЛЕНДАРЬ */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-full lg:w-[350px] shrink-0 h-fit">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
              <h2 className="font-bold text-lg text-gray-800 capitalize">
                {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][month]} {year}
              </h2>
              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm">
              {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
              {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
                const dateStr = formatDt(day);
                const isSelected = selectedDate === dateStr;
                const hasLessons = lessons.some(l => l.date === dateStr);
                const isTodayStr = dateStr === getTodayDate();
                
                return (
                  <button key={day} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex flex-col items-center justify-center rounded-lg relative ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md' : isTodayStr ? 'bg-blue-50 text-blue-700 font-bold hover:bg-blue-100' : 'hover:bg-gray-100 text-gray-700'}`}>
                    <span>{day}</span>
                    {hasLessons && <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* СПИСОК ЗАНЯТИЙ */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex justify-between items-center pb-4 border-b border-gray-100">
               <span>План на {selectedDateObj.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'})}</span>
               <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">{DAYS_OF_WEEK[selectedDateObj.getDay()]}</span>
            </h3>

            {selectedDayLessons.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Calendar size={48} className="mb-4 text-gray-300" />
                <p>На эту дату занятий нет.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayLessons.map(lesson => {
                  const targetName = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId)?.name : students.find(s => s.id === lesson.targetId)?.name;
                  return (
                    <div 
                      key={lesson.id} 
                      onClick={() => openLessonModal(lesson.date, lesson)} 
                      className={`cursor-pointer p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between transition gap-4 hover:shadow-md ${lesson.status === 'completed' ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-blue-100 hover:border-blue-300'}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`font-bold px-3 py-2 rounded-lg text-lg min-w-[80px] text-center ${lesson.status === 'completed' ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>
                          {lesson.time}
                        </div>
                        <div>
                          <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${lesson.type === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {lesson.type === 'group' ? 'Группа' : 'Индивидуально'}
                          </div>
                          <h4 className="font-bold text-gray-800 text-lg">{targetName}</h4>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 sm:self-auto self-end">
                         {lesson.status === 'planned' ? (
                            <>
                              <button onClick={(e) => handleDeleteLesson(lesson.id, e)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition" title="Удалить"><Trash2 size={20} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedLesson(lesson); setIsAttendanceModalOpen(true); }} className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg flex items-center transition font-medium">
                                <PlayCircle size={18} className="mr-2" /> Провести
                              </button>
                            </>
                         ) : (
                            <>
                              <button onClick={(e) => handleDeleteLesson(lesson.id, e)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition" title="Удалить занятие (вернутся деньги)"><Trash2 size={20} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedLesson(lesson); setIsAttendanceModalOpen(true); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center font-medium transition">
                                <CheckCircle size={18} className="mr-2 text-green-600" /> Изменить отметки
                              </button>
                            </>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => { 
    const getPeriodBounds = (p) => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      if (p === 'current_month') return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
      if (p === 'last_month') return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
      if (p === 'next_month') return { start: new Date(y, m + 1, 1), end: new Date(y, m + 2, 0, 23, 59, 59) };
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
    };

    const bounds = getPeriodBounds(analyticsPeriod);
    const isDateInBounds = (dateStr) => { const d = new Date(dateStr + 'T00:00:00'); return d >= bounds.start && d <= bounds.end; };
    const periodTransactions = transactions.filter(tx => isDateInBounds(tx.date));
    const totalPayments = periodTransactions.filter(tx => tx.type === 'payment').reduce((sum, tx) => sum + tx.amount, 0);
    const periodLessons = lessons.filter(l => isDateInBounds(l.date));

    let earnedFromLessons = 0; let projectedIncome = 0;
    periodLessons.forEach(lesson => {
      let lessonValue = 0;
      if (lesson.type === 'individual') {
        const student = students.find(s => s.id === lesson.targetId);
        if (student) lessonValue = student.rate;
      } else if (lesson.type === 'group') {
        const group = groups.find(g => g.id === lesson.targetId);
        // Вычисляем стоимость с учетом rateOverrides
        if (group) lessonValue = group.studentIds.reduce((sum, sId) => { 
            const s = students.find(st => st.id === sId); 
            const overriddenRate = group.rateOverrides?.[sId];
            return sum + (overriddenRate !== undefined ? overriddenRate : (s ? s.rate : 0)); 
        }, 0);
      }

      if (lesson.status === 'completed') {
         let actualValue = 0;
         const group = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId) : null;

         Object.entries(lesson.attendance || {}).forEach(([sId, isPresent]) => {
            if (isPresent) { 
              const s = students.find(st => st.id === Number(sId)); 
              if (s) {
                 const finalRate = group?.rateOverrides?.[s.id] !== undefined ? group.rateOverrides[s.id] : s.rate;
                 actualValue += finalRate; 
              }
            }
         });
         earnedFromLessons += actualValue;
      } else if (lesson.status === 'planned') projectedIncome += lessonValue;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Аналитика</h1>
          <select value={analyticsPeriod} onChange={(e) => setAnalyticsPeriod(e.target.value)} className="px-4 py-2 border rounded-lg bg-white shadow-sm outline-none">
            <option value="last_month">Прошлый месяц</option>
            <option value="current_month">Этот месяц</option>
            <option value="next_month">Следующий месяц</option>
            <option value="all_time">За все время</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 mb-2">Поступило оплат</p><p className="text-3xl font-extrabold text-gray-900">{totalPayments} ₽</p></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 mb-2">Оказано услуг на</p><p className="text-3xl font-extrabold text-gray-900">{earnedFromLessons} ₽</p></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><p className="text-sm text-gray-500 mb-2">Ожидаемый доход</p><p className="text-3xl font-extrabold text-gray-900">{projectedIncome} ₽</p></div>
        </div>
      </div>
    );
  };

  const renderFinance = () => { 
    // Выбираем прошедшие занятия и сортируем от новых к старым (показываем последние 10)
    const pastLessons = lessons
      .filter(l => l.status === 'completed')
      .sort((a, b) => {
        if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
        return b.time.localeCompare(a.time);
      })
      .slice(0, 10);

    // Функция быстрой оплаты долга в 1 клик
    const handleQuickPay = (studentId, amount) => {
      handleSaveTransaction({
        studentId: studentId,
        type: 'payment',
        amount: amount,
        date: getTodayDate(),
        comment: 'Быстрая оплата долга'
      });
    };

    // Функция отмены оплаты (возвращает долг в размере стоимости занятия)
    const handleUndoPay = (studentId, amount) => {
      handleSaveTransaction({
        studentId: studentId,
        type: 'charge',
        amount: amount,
        date: getTodayDate(),
        comment: 'Отмена статуса Оплачено'
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Финансы</h1>
          <button onClick={() => setIsTransactionModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition"><Plus size={20} className="mr-2" /> Добавить</button>
        </div>

        {/* НОВЫЙ БЛОК: КОНТРОЛЬ ОПЛАТ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <CheckCircle className="mr-2 text-blue-500" size={20} /> 
              Контроль оплат (Недавние занятия)
            </h2>
          </div>
          <div className="p-0">
            {pastLessons.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Нет проведенных занятий.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pastLessons.map(lesson => {
                  const targetName = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId)?.name : students.find(s => s.id === lesson.targetId)?.name;
                  const group = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId) : null;
                  
                  // Получаем тех, кто реально был на уроке
                  const attendees = Object.entries(lesson.attendance || {})
                    .filter(([_, isPresent]) => isPresent)
                    .map(([id]) => students.find(s => s.id === Number(id)))
                    .filter(Boolean);

                  if (attendees.length === 0) return null;

                  return (
                    <div key={lesson.id} className="p-4 hover:bg-gray-50/50 transition">
                      <div className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                        <Calendar size={14} className="mr-1.5" /> 
                        {new Date(lesson.date).toLocaleDateString('ru-RU')} в {lesson.time} 
                        <span className="mx-2 text-gray-300">•</span> 
                        <span className="text-gray-800 font-bold">{targetName}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {attendees.map(student => {
                          const isPaid = student.balance >= 0;
                          const debt = Math.abs(student.balance);
                          const rate = group?.rateOverrides?.[student.id] !== undefined ? group.rateOverrides[student.id] : student.rate;

                          return (
                            <div key={student.id} className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                              <div>
                                <span className="font-bold text-gray-800 block text-sm">{student.name}</span>
                                <span className="text-xs text-gray-500">Списано: {rate} ₽</span>
                              </div>
                              <div>
                                {isPaid ? (
                                  <button
                                    onClick={() => handleUndoPay(student.id, rate)}
                                    className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-md text-xs font-bold flex items-center transition shadow-sm cursor-pointer"
                                    title="Нажмите, чтобы отменить (вернуть долг за занятие)"
                                  >
                                    <CheckCircle size={14} className="mr-1" /> Оплачено
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleQuickPay(student.id, debt)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-md text-xs font-bold flex items-center transition shadow-sm"
                                    title="Нажмите, чтобы быстро погасить долг"
                                  >
                                    <Wallet size={14} className="mr-1" /> Не оплачено
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* СТАРЫЙ БЛОК: ИСТОРИЯ ОПЕРАЦИЙ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">История операций</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 text-gray-500 text-sm border-b"><th className="p-4">Дата</th><th className="p-4">Ученик</th><th className="p-4">Сумма</th></tr></thead>
              <tbody>
                {transactions.map(tx => {
                  const student = students.find(s => s.id === tx.studentId);
                  const isPayment = tx.type === 'payment';
                  return (
                    <tr key={tx.id} className="border-b">
                      <td className="p-4 text-sm">{new Date(tx.date).toLocaleDateString('ru-RU')}</td>
                      <td className="p-4 font-medium">{student?.name || 'Удален'}</td>
                      <td className={`p-4 font-bold ${isPayment ? 'text-green-600' : 'text-red-600'}`}>{isPayment ? '+' : '-'}{tx.amount} ₽</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col transition-all">
        <div className="p-4 md:p-6 flex justify-between md:flex-col items-center md:items-start">
          <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center"><BookOpen className="mr-2 text-blue-500" /> TutorApp</h2>
          {user && (
             <div className="md:mt-4 flex items-center text-xs text-slate-400 bg-slate-800 py-1.5 px-3 rounded-lg">
              {syncStatus === 'syncing' ? <Cloud className="animate-pulse mr-2 text-blue-400" size={14} /> : syncStatus === 'saved' ? <Cloud className="mr-2 text-green-400" size={14} /> : <CloudOff className="mr-2 text-red-400" size={14} />}
              <span className="hidden md:inline">{syncStatus === 'syncing' ? 'Сохранение...' : syncStatus === 'saved' ? 'Сохранено' : 'Оффлайн'}</span>
            </div>
          )}
        </div>
        
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-4 space-x-2 md:space-x-0 md:space-y-2 mt-2 md:mt-4 pb-2 md:pb-0 hide-scrollbar">
          <NavItem icon={<LayoutDashboard size={20} />} label="Обзор" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Calendar size={20} />} label="Расписание" isActive={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
          <NavItem icon={<Users size={20} />} label="Ученики" isActive={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <NavItem icon={<BookOpen size={20} />} label="Группы" isActive={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
          <NavItem icon={<Wallet size={20} />} label="Финансы" isActive={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <NavItem icon={<TrendingUp size={20} />} label="Аналитика" isActive={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {!isLoaded ? (
          <div className="flex flex-col h-full items-center justify-center text-gray-400"><Sparkles size={40} className="animate-spin text-blue-500 mb-4"/> Загрузка...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'students' && renderStudents()}
            {activeTab === 'groups' && renderGroups()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'finance' && renderFinance()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </main>

      {/* MODALS */}
      {isStudentModalOpen && <StudentModal student={editingStudent} onClose={() => setIsStudentModalOpen(false)} onSave={handleSaveStudent} />}
      {isGroupModalOpen && <GroupModal students={students} onClose={() => setIsGroupModalOpen(false)} onSave={handleSaveGroup} />}
      {isTransactionModalOpen && <TransactionModal students={students} onClose={() => setIsTransactionModalOpen(false)} onSave={handleSaveTransaction} />}
      {isLessonModalOpen && (
        <LessonModal 
          students={students} groups={groups} initialDate={lessonModalDate} 
          lessonToEdit={editingLesson} 
          onClose={() => { setIsLessonModalOpen(false); setEditingLesson(null); }} 
          onSave={(data) => handleSaveLesson(data, editingLesson?.id)} 
        />
      )}
      {isAttendanceModalOpen && selectedLesson && (
        <AttendanceModal 
          lesson={selectedLesson} 
          students={students} 
          groups={groups} 
          onClose={() => { setIsAttendanceModalOpen(false); setSelectedLesson(null); }} 
          onSave={handleSaveAttendance} 
        />
      )}
    </div>
  );
}

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-colors whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
      {icon}<span className="font-medium text-sm md:text-base">{label}</span>
    </button>
  );
}

function LessonModal({ students, groups, initialDate, lessonToEdit, onClose, onSave }) {
  const [type, setType] = useState(lessonToEdit ? lessonToEdit.type : 'individual');
  const [targetId, setTargetId] = useState(lessonToEdit ? String(lessonToEdit.targetId) : '');
  const [date, setDate] = useState(lessonToEdit ? lessonToEdit.date : (initialDate || new Date().toISOString().split('T')[0]));
  const [time, setTime] = useState(lessonToEdit ? lessonToEdit.time : '15:00');
  
  // Множественный выбор дней недели
  const [selectedDays, setSelectedDays] = useState([]);
  
  // Автопродление (только при создании)
  const [isRecurring, setIsRecurring] = useState(false);
  const [weeks, setWeeks] = useState(4);

  // Инициализация дней по выбранной дате
  React.useEffect(() => {
    if (!lessonToEdit && selectedDays.length === 0 && date) {
      const d = new Date(date).getDay();
      setSelectedDays([d]);
    }
  }, [date, lessonToEdit]);

  React.useEffect(() => {
    if (type === 'individual' && students.length > 0 && !targetId) setTargetId(students[0].id);
    if (type === 'group' && groups.length > 0 && (!targetId || !groups.find(g=>g.id === Number(targetId)))) setTargetId(groups[0].id);
  }, [type, students, groups]);

  const toggleDay = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length > 1) setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!targetId) return;

    const baseLesson = { type, targetId: Number(targetId), time };
    
    // Если редактируем существующий
    if (lessonToEdit) {
      onSave([{ ...baseLesson, date }]);
      return;
    }

    // Если создаем новые (в т.ч. на несколько дней и недель)
    const lessonsArray = [];
    const [y, m, d] = date.split('-').map(Number);
    const baseDateObj = new Date(y, m - 1, d);

    // Генерируем для каждого выбранного дня недели
    selectedDays.forEach(dayIndex => {
      let iterDate = new Date(baseDateObj);
      const currentDay = iterDate.getDay();
      const daysToAdd = (dayIndex - currentDay + 7) % 7;
      iterDate.setDate(iterDate.getDate() + daysToAdd); // Первый подходящий день начиная с baseDate

      const wCount = isRecurring ? weeks : 1;
      for (let i = 0; i < wCount; i++) {
        const nextDate = new Date(iterDate);
        nextDate.setDate(iterDate.getDate() + (i * 7));
        const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        lessonsArray.push({ ...baseLesson, date: nextDateStr });
      }
    });

    onSave(lessonsArray);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{lessonToEdit ? 'Изменить занятие' : 'Новое занятие'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-4 mb-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" value="individual" checked={type === 'individual'} onChange={(e) => setType(e.target.value)} className="mr-2 text-blue-600" /> Индивидуально
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" value="group" checked={type === 'group'} onChange={(e) => setType(e.target.value)} className="mr-2 text-blue-600" /> Группа
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'individual' ? 'Ученик' : 'Группа'}</label>
            <select required value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
              {type === 'individual' 
                ? students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                : groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
              }
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lessonToEdit ? 'Дата' : 'Дата начала'}</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" />
            </div>
          </div>

          {/* Множественный выбор дней и повторение (Только при создании) */}
          {!lessonToEdit && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Дни недели для занятий:</p>
                <div className="flex justify-between gap-1">
                  {DAY_INDEXES.map(idx => (
                    <button 
                      key={idx} type="button" onClick={() => toggleDay(idx)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition ${selectedDays.includes(idx) ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-300 hover:bg-gray-100'}`}
                    >
                      {DAYS_OF_WEEK[idx]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <label className="flex items-center cursor-pointer mb-2">
                  <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded text-blue-600 w-4 h-4 mr-2" />
                  <span className="text-sm font-medium text-gray-800 flex items-center"><Repeat size={16} className="mr-1 text-gray-500"/> Повторять еженедельно</span>
                </label>
                {isRecurring && (
                  <div className="flex items-center mt-2 pl-6">
                    <span className="text-sm text-gray-600 mr-2">на</span>
                    <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="px-2 py-1 border rounded-md text-sm">
                      {[2, 3, 4, 5, 8, 12, 16].map(w => <option key={w} value={w}>{w} нед.</option>)}
                    </select>
                    <span className="text-sm text-gray-600 ml-2">вперед</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
            <button type="submit" disabled={!targetId} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
               {lessonToEdit ? 'Сохранить изменения' : 'Создать занятия'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ... Остальные модальные окна остались без изменений (StudentModal, GroupModal, TransactionModal, AttendanceModal) ...

function StudentModal({ student, onClose, onSave }) {
  const [name, setName] = useState(student ? student.name : '');
  const [rate, setRate] = useState(student ? student.rate : 1500);
  const [phone, setPhone] = useState(student ? student.phone : '');
  const handleSubmit = (e) => { e.preventDefault(); if(!name.trim()) return; onSave({ name, rate: Number(rate), phone }); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">{student ? 'Редактировать ученика' : 'Новый ученик'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="ФИО" className="w-full px-4 py-2 border rounded-lg" />
          <input type="number" required value={rate} onChange={e => setRate(e.target.value)} placeholder="Ставка" className="w-full px-4 py-2 border rounded-lg" />
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон" className="w-full px-4 py-2 border rounded-lg" />
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Отмена</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Сохранить</button></div>
        </form>
      </div>
    </div>
  );
}

function GroupModal({ students, onClose, onSave }) {
  const [name, setName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const toggleStudent = (id) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]);
  const handleSubmit = (e) => { e.preventDefault(); if(!name.trim()) return; onSave({ name, studentIds: selectedStudents }); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Новая группа</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Название" className="w-full px-4 py-2 border rounded-lg" />
          <div className="max-h-48 overflow-y-auto border p-2 rounded-lg space-y-1">
            {students.map(student => (
              <label key={student.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" className="mr-3" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} />{student.name}</label>
            ))}
          </div>
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Отмена</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Сохранить</button></div>
        </form>
      </div>
    </div>
  );
}

function TransactionModal({ students, onClose, onSave }) {
  const [studentId, setStudentId] = useState(students.length > 0 ? students[0].id : '');
  const [type, setType] = useState('payment');
  const [amount, setAmount] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onSave({ studentId: Number(studentId), type, amount: Number(amount), date: new Date().toISOString().split('T')[0], comment: '' }); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Новая операция</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.balance} ₽)</option>)}
          </select>
          <div className="flex space-x-4">
            <select value={type} onChange={(e) => setType(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg"><option value="payment">Оплата (+)</option><option value="charge">Списание (-)</option></select>
            <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма" className="flex-1 px-4 py-2 border rounded-lg" />
          </div>
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Отмена</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Провести</button></div>
        </form>
      </div>
    </div>
  );
}

function AttendanceModal({ lesson, students, groups, onClose, onSave }) {
  const group = lesson.type === 'group' ? groups.find(g => g.id === lesson.targetId) : null;
  const lessonStudents = React.useMemo(() => lesson.type === 'individual' ? [students.find(s => s.id === lesson.targetId)].filter(Boolean) : (group?.studentIds?.map(id => students.find(s => s.id === id)).filter(Boolean) || []), [lesson, students, groups]);
  
  const [attendance, setAttendance] = useState(() => { 
      // Если урок уже был завершен, берем старые данные. Иначе считаем, что все были.
      if (lesson.status === 'completed' && lesson.attendance) {
          return lesson.attendance;
      }
      const initial = {}; 
      lessonStudents.forEach(s => initial[s.id] = true); 
      return initial; 
  });

  const toggleAttendance = (id) => setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(lesson.id, attendance); };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Отметки присутствия</h2>
        <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p><strong>Дата:</strong> {new Date(lesson.date).toLocaleDateString('ru-RU')} в {lesson.time}</p>
          <p className="mt-1">
            Снимите галочки с тех, кто отсутствовал. Деньги будут <strong>возвращены</strong> на их баланс (или не будут списаны, если урок проводится впервые).
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-64 overflow-y-auto border border-gray-200 p-2 rounded-lg space-y-1">
            {lessonStudents.map(student => {
              const displayRate = group?.rateOverrides?.[student.id] !== undefined ? group.rateOverrides[student.id] : student.rate;
              return (
                <label key={student.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded cursor-pointer transition">
                  <div className="flex items-center"><input type="checkbox" className="mr-3 w-5 h-5 text-blue-600 focus:ring-blue-500 rounded" checked={attendance[student.id] || false} onChange={() => toggleAttendance(student.id)} />
                    <span className={`font-medium ${!attendance[student.id] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{student.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${!attendance[student.id] ? 'text-gray-300' : 'text-gray-500'}`}>{displayRate} ₽</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Отмена</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center transition shadow-sm">
              <CheckCircle size={18} className="mr-2" /> {lesson.status === 'completed' ? 'Сохранить изменения' : 'Завершить урок'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}