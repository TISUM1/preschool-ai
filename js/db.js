/* ============================================
   Dexie.js Database Layer — 幼师AI助手
   Tables: resources, documents, settings, classes, students
   (templates are session-only, not persisted)
   ============================================ */

var db = new Dexie('KindergartenTeacher');

db.version(1).stores({
  resources: '++id, type, uploadedAt',
  documents: '++id, title, type, createdAt, updatedAt, archived',
  settings: '++id, key'
});

db.version(2).stores({
  resources: '++id, type, uploadedAt',
  documents: '++id, title, type, createdAt, updatedAt, archived',
  settings: '++id, key',
  classes: '++id, grade, name',
  students: '++id, classId, name'
});

// --- Resource CRUD ---
var ResourceDB = {
  add: function(r) {
    r.uploadedAt = new Date();
    return db.resources.add(r);
  },
  getAll: function(type) {
    var col = db.resources.orderBy('uploadedAt');
    if (type) return col.filter(function(r) { return r.type === type; }).reverse().toArray();
    return col.reverse().toArray();
  },
  getById: function(id) { return db.resources.get(id); },
  count: function(type) {
    if (type) return db.resources.where('type').equals(type).count();
    return db.resources.count();
  },
  countByType: async function() {
    var all = await db.resources.toArray();
    return {
      plan: all.filter(function(r) { return r.type === 'plan'; }).length,
      observation: all.filter(function(r) { return r.type === 'observation'; }).length,
      paper: all.filter(function(r) { return r.type === 'paper'; }).length
    };
  },
  remove: function(id) {
    return db.resources.delete(id);
  },
  getSummaries: async function(type) {
    var items = type
      ? await db.resources.where('type').equals(type).toArray()
      : await db.resources.toArray();
    return items.map(function(r) { return {
      id: r.id, fileName: r.fileName,
      content: r.fileFormat === 'pdf' ? r.rawText : r.rawHtml,
      sections: r.sections || []
    };});
  }
};

// --- Document CRUD ---
var DocumentDB = {
  add: function(doc) {
    doc.createdAt = new Date();
    doc.updatedAt = new Date();
    doc.archived = false;
    return db.documents.add(doc);
  },
  update: function(id, data) {
    data.updatedAt = new Date();
    return db.documents.update(id, data);
  },
  getAll: function(filter) {
    var col = db.documents.orderBy('createdAt').reverse();
    if (filter && filter.type) {
      col = col.filter(function(d) { return d.type === filter.type; });
    }
    if (filter && filter.archived === false) {
      col = col.filter(function(d) { return !d.archived; });
    }
    return col.toArray();
  },
  getRecent: function(limit) {
    limit = limit || 5;
    return db.documents.orderBy('updatedAt').reverse().limit(limit).toArray();
  },
  getById: function(id) { return db.documents.get(id); },
  remove: function(id) { return db.documents.delete(id); },
  archive: function(id) {
    return db.documents.update(id, { archived: true });
  }
};

// --- Settings CRUD ---
var SettingsDB = {
  get: async function(key, defaultVal) {
    var item = await db.settings.where('key').equals(key).first();
    return item ? item.value : defaultVal;
  },
  set: async function(key, value) {
    var exist = await db.settings.where('key').equals(key).first();
    if (exist) return db.settings.update(exist.id, { value: value });
    return db.settings.add({ key: key, value: value });
  },
  getAll: async function() {
    var items = await db.settings.toArray();
    var map = {};
    items.forEach(function(i) { map[i.key] = i.value; });
    return map;
  }
};

// --- Class CRUD ---
var ClassDB = {
  add: function(cls) {
    cls.createdAt = new Date();
    return db.classes.add(cls);
  },
  getAll: function() {
    return db.classes.orderBy('grade').toArray();
  },
  getById: function(id) { return db.classes.get(id); },
  update: function(id, data) {
    return db.classes.update(id, data);
  },
  remove: async function(id) {
    await db.students.where('classId').equals(id).delete();
    return db.classes.delete(id);
  },
  count: function() { return db.classes.count(); }
};

// --- Student CRUD ---
var StudentDB = {
  add: function(student) {
    return db.students.add(student);
  },
  getByClass: function(classId) {
    return db.students.where('classId').equals(classId).toArray();
  },
  getById: function(id) { return db.students.get(id); },
  update: function(id, data) {
    return db.students.update(id, data);
  },
  remove: function(id) {
    return db.students.delete(id);
  },
  countByClass: function(classId) {
    return db.students.where('classId').equals(classId).count();
  },
  getAll: function() {
    return db.students.toArray();
  }
};
