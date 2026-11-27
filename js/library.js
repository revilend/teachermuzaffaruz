/* ============================================================
   FOYDALI MANBALAR VA FILMLAR
   ------------------------------------------------------------
   Ustoz repititorlik guruhlariga har qanday faylni (PDF, Word,
   Excel, PowerPoint, rasm, video...) va filmlarni yuklaydi.
   O'quvchi o'z guruhidagi manbalarni/filmlarni ko'radi.
   Fayl o'chirilganda R2 yoki Supabase Storage'dan ham, bazadan ham
   butunlay o'chiriladi.
   Film pleyeri: pauza, ±10 soniya, to'liq ekran, subtitr.
   Ko'rilgan vaqt faqat uzluksiz (pauzasiz, o'tkazib yuborishsiz)
   oqimdan hisoblanadi va botga xabar qilinadi.
   ============================================================ */
(function () {
  'use strict';

  var KEYS = {
    resources: 'et_library_resources',
    movies: 'et_library_movies',
    cues: 'et_library_cues',
    watch: 'et_library_watch'
  };
  var WATCH_NOTIFY_EVERY_SEC = 300;      /* har 5 daqiqa uzluksiz ko'rish */
  var SUBS_POLL_MS = 4000;
  var SUBS_POLL_TRIES = 450;             /* ~30 daqiqa: film transkripsiyasi uzoq davom etadi */
  var PULL_TTL_MS = 15000;

  var libClientCache = null;
  var libPullPromise = null;
  var libPullAt = 0;
  var libPlayer = null;
  var libSubsTimer = null;
  var libToastTimer = null;

  /* ---------------- ikonkalar (loyihadagi uslubda, emoji yo'q) ---------------- */
  function libIco(name, size) {
    var s = Number(size) || 18;
    var paths = {
      play: '<path d="M8 5v14l11-7z"/>',
      pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
      back10: '<path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/><text x="9" y="16" font-size="6" fill="currentColor">10</text>',
      fwd10: '<path d="M12 5V2l5 4-5 4V7a5 5 0 1 0 5 5h2a7 7 0 1 1-7-7z"/><text x="9" y="16" font-size="6" fill="currentColor">10</text>',
      expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
      cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 10a2.5 2.5 0 1 0 0 4M17 10a2.5 2.5 0 1 0 0 4"/>',
      film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>',
      download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      check: '<path d="M5 12l4 4 10-10"/>',
      alert: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>',
      eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
    };
    return '<svg class="lib-ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.folder) + '</svg>';
  }

  /* ---------------- bulut klienti ---------------- */
  function libClient() {
    if (libClientCache) return libClientCache;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    try {
      libClientCache = window.supabase.createClient(
        window.SUPABASE_URL || 'https://mvjoeqyqaylfccqcnwwe.supabase.co',
        window.SUPABASE_ANON_KEY || 'sb_publishable_PHMC_kfQfu5BLFgDOzHsjw_B0VO2xDI'
      );
    } catch (e) { libClientCache = null; }
    return libClientCache;
  }

  /* ---------------- saqlash qatlami ----------------
     Asosiy yo'l — `library_*` jadvallari. Agar ustoz SQL qismini hali
     ishga tushirmagan bo'lsa (PGRST205), ma'lumot mavjud `bot_settings`
     jadvalida `lib_*` kalitlari bilan saqlanadi — bo'lim SQLsiz ham ishlaydi. */
  var LIB_STORE = '';            /* '' | 'tables' | 'kv' */
  var libStoreProbe = null;
  var KV = { res: 'lib_res_', mov: 'lib_mov_', cue: 'lib_cue_', watch: 'lib_watch_' };

  function libMissingTable(err) {
    var m = String((err && (err.message || err.details || err)) || '');
    return /PGRST205|schema cache|does not exist|could not find the table/i.test(m);
  }
  function libStoreMode(c) {
    if (LIB_STORE) return Promise.resolve(LIB_STORE);
    if (libStoreProbe) return libStoreProbe;
    libStoreProbe = c.from('library_movies').select('id').limit(1).then(function (res) {
      if (res && res.error && libMissingTable(res.error)) { LIB_STORE = 'kv'; return LIB_STORE; }
      /* Jadvallar bor, lekin avval bot_settings'ga saqlangan bo'lsa — o'shandan davom etamiz */
      return c.from('bot_settings').select('key').ilike('key', 'lib_*').limit(1).then(function (kv) {
        LIB_STORE = kv && !kv.error && kv.data && kv.data.length ? 'kv' : 'tables';
        return LIB_STORE;
      });
    }).catch(function () { LIB_STORE = 'tables'; return LIB_STORE; });
    return libStoreProbe;
  }
  function libKvId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function libKvParse(row) {
    try { return JSON.parse(row && row.value ? row.value : 'null'); } catch (e) { return null; }
  }
  async function libKvList(c, pattern) {
    var res = await c.from('bot_settings').select('key,value').ilike('key', pattern);
    if (res && res.error) throw res.error;
    return (res && res.data) || [];
  }
  async function libKvKeys(c, pattern) {
    var res = await c.from('bot_settings').select('key').ilike('key', pattern);
    if (res && res.error) throw res.error;
    return (res && res.data) || [];
  }
  async function libKvGet(c, key) {
    var res = await c.from('bot_settings').select('key,value').eq('key', key).limit(1);
    if (res && res.error) throw res.error;
    var row = res && res.data && res.data[0];
    return row ? libKvParse(row) : null;
  }
  async function libKvPut(c, key, value) {
    var raw = typeof value === 'string' ? value : JSON.stringify(value);
    var res = await c.from('bot_settings').upsert({ key: key, value: raw }, { onConflict: 'key' });
    if (res && res.error) throw res.error;
  }
  async function libKvDelete(c, pattern) {
    var res = await c.from('bot_settings').delete().ilike('key', pattern);
    if (res && res.error) throw res.error;
  }
  function libCueParts(key, movieDbId) {
    var rest = String(key).slice((KV.cue + movieDbId + '_').length);
    var bits = rest.split('_');
    return { status: bits[0] || 'pending', lang: bits[1] || '' };
  }

  /* ---------------- lokal saqlash ---------------- */
  function readList(key) {
    var v = store.get(key, []);
    return Array.isArray(v) ? v : [];
  }
  function writeList(key, list) { store.set(key, Array.isArray(list) ? list : []); }

  function resourcesAll() { return readList(KEYS.resources); }
  function moviesAll() { return readList(KEYS.movies); }
  function cuesMetaAll() { return readList(KEYS.cues); }
  function watchAll() { return readList(KEYS.watch); }

  function tutoringGroups() {
    return getGroups().filter(function (g) { return !!g && groupTypeOf(g) === 'tutoring'; });
  }
  function groupDbId(gid) {
    var g = groupById(gid);
    return g && g.dbId != null ? g.dbId : null;
  }
  function groupName(gid) {
    var g = groupById(gid);
    return g ? g.name : '';
  }
  function groupStudents(gid) {
    return getStudents().filter(function (s) { return String(s.groupId) === String(gid); });
  }
  function isStudentUser() { return !isTeacher() && !isSupport(); }
  function currentStudent() { return isStudentUser() ? linkedStudent() : null; }

  /* ---------------- fayl turlari ---------------- */
  function libExt(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]{1,8})(?:\?|$)/);
    return m ? m[1] : '';
  }
  function libFileKind(f) {
    var mime = String((f && f.type) || '').toLowerCase();
    var ext = libExt(f && f.name);
    if (mime.indexOf('image/') === 0 || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].indexOf(ext) >= 0) return 'image';
    if (mime.indexOf('video/') === 0 || ['mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v', '3gp', 'wmv', 'flv'].indexOf(ext) >= 0) return 'video';
    if (mime.indexOf('audio/') === 0 || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac'].indexOf(ext) >= 0) return 'audio';
    if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
    if (['doc', 'docx', 'rtf', 'odt', 'txt'].indexOf(ext) >= 0) return 'word';
    if (['xls', 'xlsx', 'ods', 'csv'].indexOf(ext) >= 0) return 'excel';
    if (['ppt', 'pptx', 'odp'].indexOf(ext) >= 0) return 'powerpoint';
    if (['zip', 'rar', '7z', 'tar', 'gz'].indexOf(ext) >= 0) return 'archive';
    return 'file';
  }
  function libKindLabel(kind) {
    return {
      image: 'Rasm', video: 'Video', audio: 'Audio', pdf: 'PDF',
      word: 'Word', excel: 'Excel', powerpoint: 'PowerPoint',
      archive: 'Arxiv', file: 'Fayl'
    }[kind] || 'Fayl';
  }
  function libKindIcon(kind) {
    if (kind === 'image') return 'image';
    if (kind === 'video') return 'video';
    if (kind === 'audio') return 'headphones';
    if (kind === 'folder') return 'folder';
    return 'fileText';
  }
  function normFiles(raw) {
    var v = raw;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
    if (!Array.isArray(v)) return [];
    return v.filter(function (f) { return f && typeof f === 'object' && f.url; }).map(function (f) {
      return {
        url: String(f.url),
        type: String(f.type || 'file').toLowerCase(),
        name: String(f.name || ''),
        size: Number(f.size) || 0
      };
    });
  }

  /* ---------------- mapping ---------------- */
  function mapResource(r) {
    return {
      id: 'lr' + r.id,
      dbId: r.id,
      groupId: r.group_id != null ? 'g' + r.group_id : '',
      title: r.title || '',
      files: normFiles(r.files),
      createdAt: r.created_at || ''
    };
  }
  function mapMovie(r) {
    return {
      id: 'lm' + r.id,
      dbId: r.id,
      groupId: r.group_id != null ? 'g' + r.group_id : '',
      title: r.title || '',
      videoUrl: r.video_url || '',
      videoName: r.video_name || '',
      createdAt: r.created_at || ''
    };
  }
  function mapCueMeta(r) {
    return {
      id: 'lc' + r.id,
      dbId: r.id,
      movieDbId: r.movie_id,
      lang: r.lang || '',
      status: r.status || 'pending',
      error: r.error || '',
      updatedAt: r.updated_at || ''
    };
  }
  function mapWatch(r) {
    return {
      id: r.id,
      sid: 's' + r.student_id,
      movieDbId: r.movie_id,
      seconds: Number(r.seconds) || 0,
      streak: Number(r.streak_seconds) || 0,
      lastPosition: Number(r.last_position) || 0,
      updatedAt: r.updated_at || ''
    };
  }

  /* ---------------- bulutdan olish ---------------- */
  function libPull(force) {
    var c = libClient();
    if (!c) return Promise.resolve(false);
    if (libPullPromise) return libPullPromise;
    if (!force && Date.now() - libPullAt < PULL_TTL_MS) return Promise.resolve(false);
    libPullAt = Date.now();
    var before = JSON.stringify([resourcesAll(), moviesAll(), cuesMetaAll(), watchAll()]);
    var stu = currentStudent();
    var groupDb = stu ? groupDbId(stu.groupId) : null;
    if (stu && groupDb == null) return Promise.resolve(false);

    libPullPromise = (async function () {
      var mode = await libStoreMode(c);
      if (mode === 'kv') {
        await libPullKv(c, stu, groupDb);
        return JSON.stringify([resourcesAll(), moviesAll(), cuesMetaAll(), watchAll()]) !== before;
      }
      var rq = c.from('library_resources').select('*').order('created_at', { ascending: false });
      if (stu) rq = rq.eq('group_id', groupDb);
      var mq = c.from('library_movies').select('*').order('created_at', { ascending: false });
      if (stu) mq = mq.eq('group_id', groupDb);

      return Promise.all([rq, mq]).then(function (out) {
        var rRes = out[0], mRes = out[1];
        if (rRes.error && !/does not exist|could not find/i.test(String(rRes.error.message || ''))) {
          console.warn('[library] resources:', rRes.error.message || rRes.error);
        }
        if (!rRes.error) {
          var keepR = resourcesAll().filter(function (x) { return x.dbId == null; });
          writeList(KEYS.resources, (rRes.data || []).map(mapResource).concat(keepR));
        }
        if (!mRes.error) {
          var keepM = moviesAll().filter(function (x) { return x.dbId == null; });
          writeList(KEYS.movies, (mRes.data || []).map(mapMovie).concat(keepM));
        }
        var movies = moviesAll().filter(function (m) { return m.dbId != null; });
        if (!movies.length) { writeList(KEYS.cues, []); return false; }
        var ids = movies.map(function (m) { return m.dbId; });
        return c.from('library_movie_cues').select('id, movie_id, lang, status, error, updated_at')
          .in('movie_id', ids).then(function (cRes) {
            if (!cRes.error) writeList(KEYS.cues, (cRes.data || []).map(mapCueMeta));
            if (!stu) return false;
            return c.from('library_movie_watch').select('*').eq('student_id', stu.dbId)
              .then(function (wRes) {
                if (!wRes.error) writeList(KEYS.watch, (wRes.data || []).map(mapWatch));
                return false;
              });
          });
      }).then(function () {
        return JSON.stringify([resourcesAll(), moviesAll(), cuesMetaAll(), watchAll()]) !== before;
      }).catch(function (e) {
        console.warn('[library] pull:', (e && e.message) || e);
        return false;
      });
    })();
    libPullPromise.then(function () { libPullPromise = null; }, function () { libPullPromise = null; });
    return libPullPromise;
  }

  async function libPullKv(c, stu, groupDb) {
    var resRows = (await libKvList(c, KV.res + '*')).map(libKvParse).filter(Boolean);
    var movRows = (await libKvList(c, KV.mov + '*')).map(libKvParse).filter(Boolean);
    if (stu) {
      resRows = resRows.filter(function (r) { return String(r.group_id) === String(groupDb); });
      movRows = movRows.filter(function (m) { return String(m.group_id) === String(groupDb); });
    }
    var desc = function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); };
    resRows.sort(desc);
    movRows.sort(desc);
    writeList(KEYS.resources, resRows.map(mapResource));
    writeList(KEYS.movies, movRows.map(mapMovie));

    if (!movRows.length) {
      writeList(KEYS.cues, []);
      if (stu) writeList(KEYS.watch, []);
      return;
    }
    var movieIds = movRows.map(function (m) { return String(m.id); });
    var cueKeys = await libKvKeys(c, KV.cue + '*');
    var metas = cueKeys.map(function (row) {
      var mid = String(row.key || '').slice(KV.cue.length);
      var movieId = mid.split('_')[0];
      var p = libCueParts(row.key, movieId);
      return { id: row.key, movie_id: movieId, status: p.status, lang: p.lang, error: '', updated_at: '' };
    }).filter(function (m) { return movieIds.indexOf(String(m.movie_id)) >= 0; });
    metas.sort(function (a, b) { return (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1); });
    var seen = {};
    var unique = metas.filter(function (m) {
      if (seen[String(m.movie_id)]) return false;
      seen[String(m.movie_id)] = true;
      return true;
    });
    writeList(KEYS.cues, unique.map(mapCueMeta));

    if (stu) {
      var wRows = (await libKvList(c, KV.watch + '*')).map(libKvParse).filter(Boolean)
        .filter(function (w) { return String(w.student_id) === String(stu.dbId); });
      writeList(KEYS.watch, wRows.map(mapWatch));
    }
  }

  function libRefreshIf(scr) {
    libPull().then(function (changed) {
      if (!changed) return;
      if (state.screen === scr) render();
    }).catch(function () {});
  }

  /* ---------------- o'chirish (R2 + Supabase Storage) ---------------- */
  async function deleteCloudFile(url) {
    var u = String(url || '');
    if (!u) return false;
    if (isR2Url(u)) return deleteFileFromR2(u);
    var m = u.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
    if (!m) return false;
    var c = libClient();
    if (!c) return false;
    try {
      var res = await c.storage.from(m[1]).remove([decodeURIComponent(m[2])]);
      return !res.error;
    } catch (e) {
      console.warn('[library] storage delete:', (e && e.message) || e);
      return false;
    }
  }
  async function deleteCloudFiles(urls) {
    var list = Array.isArray(urls) ? urls : [];
    for (var i = 0; i < list.length; i++) {
      try { await deleteCloudFile(list[i]); } catch (e) { /* davom etamiz */ }
    }
  }

  /* ---------------- bot xabarnomalari ---------------- */
  function libAppLink() {
    try {
      if (typeof mockAppLink === 'function') return mockAppLink();
      var loc = window.location || {};
      if (loc.protocol !== 'http:' && loc.protocol !== 'https:') return '';
      return String(loc.origin || '') + String(loc.pathname || '/');
    } catch (e) { return ''; }
  }
  async function notifyGroupStudents(gid, text) {
    if (!CloudSync || !CloudSync.ready()) return 0;
    var list = groupStudents(gid).filter(function (s) { return !!s.telegramChatId; });
    if (!list.length) return 0;
    try {
      await CloudSync.queueMessages(list.map(function (s) {
        return {
          chat_id: String(s.telegramChatId),
          student_id: s.dbId == null ? null : s.dbId,
          status: 'pending',
          text: text
        };
      }));
      return list.length;
    } catch (e) {
      console.warn('[library] notify:', (e && e.message) || e);
      return 0;
    }
  }
  function linkHTML(label) {
    var link = libAppLink();
    return link ? '<a href="' + esc(link) + '">' + esc(label) + '</a>' : '<b>' + esc(label) + '</b>';
  }
  async function notifyResourceAdded(row, count, total) {
    var gname = groupName(row.groupId);
    var text = '📚 <b>YANGI FOYDALI MANBA!</b>\n\n' +
      '📁 <b>' + esc(row.title) + '</b>\n' +
      '👥 Guruh: <b>' + esc(gname || '—') + '</b>\n' +
      '📎 Fayllar: <b>' + esc(String(count)) + ' ta</b>\n\n' +
      "Ilovadagi <b>Foydali manbalar</b> bo'limidan ochib yuklab oling. " + linkHTML('Ilovani ochish');
    return notifyGroupStudents(row.groupId, text);
  }
  async function notifyMovieAdded(row) {
    var gname = groupName(row.groupId);
    var text = '🎬 <b>YANGI FILM QO\'SHILDI!</b>\n\n' +
      '🎞 <b>' + esc(row.title) + '</b>\n' +
      '👥 Guruh: <b>' + esc(gname || '—') + '</b>\n\n' +
      "Ilovadagi <b>Filmlar</b> bo'limidan tomosha qiling. " + linkHTML('Ilovani ochish');
    return notifyGroupStudents(row.groupId, text);
  }
  async function notifyWatch(movie, st, streakSec, totalSec) {
    if (!CloudSync || !CloudSync.ready() || !st) return false;
    var mins = Math.max(1, Math.floor(streakSec / 60));
    var totalMins = Math.max(1, Math.floor(totalSec / 60));
    var teacherText = '🎬 <b>FILM KO\'RILDI</b>\n\n' +
      "👤 <b>O'quvchi:</b> " + esc(st.fullName) + '\n' +
      '🎞 <b>Film:</b> ' + esc(movie.title) + '\n' +
      '⏱ <b>Uzluksiz:</b> ' + mins + ' daqiqa\n' +
      '📊 <b>Jami:</b> ' + totalMins + ' daqiqa\n\n' +
      "Faqat uzluksiz (pauzasiz va o'tkazib yuborishsiz) ko'rilgan vaqt hisobga olindi.";
    var rows = [{ chat_id: '0', student_id: st.dbId == null ? null : st.dbId, status: 'pending', text: teacherText }];
    if (st.telegramChatId) {
      rows.push({
        chat_id: String(st.telegramChatId),
        student_id: st.dbId == null ? null : st.dbId,
        status: 'pending',
        text: '🎬 <b>Film ko\'rildi</b>\n\n<b>' + esc(movie.title) + '</b> filmini ' +
          mins + ' daqiqa uzluksiz ko\'rdingiz.\n📊 Jami: <b>' + totalMins + ' daqiqa</b>.'
      });
    }
    try { await CloudSync.queueMessages(rows); return true; }
    catch (e) { console.warn('[library] watch notify:', (e && e.message) || e); return false; }
  }

  /* ---------------- ustoz: ekranlar ---------------- */
  function libResourcesScreen() {
    if (!isTeacher()) return blockedScreen("Bu bo'lim faqat o'qituvchi uchun");
    libRefreshIf('resources');
    var list = resourcesAll().slice().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return backRowHTML('home') + '\n' +
      '<div class="screen-head">\n' +
      '  <div>\n' +
      '    <h2 class="screen-title">' + libIco('folder', 17) + ' ' + t('Foydali manbalar') + '</h2>\n' +
      '    <div class="muted small">' + t('Repititorlik guruhlari uchun fayllar') + '</div>\n' +
      '  </div>\n' +
      '  <button type="button" class="btn btn-primary btn-sm" data-lib-act="add-resource">+ ' + t("Manba qo'shish") + '</button>\n' +
      '</div>\n' +
      (list.length ? list.map(resourceCardTeacher).join('') : emptyState("Hozircha manba yo'q", 'folder'));
  }

  function libMoviesScreen() {
    if (!isTeacher()) return blockedScreen("Bu bo'lim faqat o'qituvchi uchun");
    if (state.libMovieId) {
      var playing = moviesAll().filter(function (x) { return x.id === state.libMovieId; })[0];
      if (playing) return moviePlayerHTML(playing, currentStudent());
      state.libMovieId = '';
    }
    libRefreshIf('movies');
    var list = moviesAll().slice().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return backRowHTML('home') + '\n' +
      '<div class="screen-head">\n' +
      '  <div>\n' +
      '    <h2 class="screen-title">' + libIco('film', 17) + ' ' + t('Filmlar') + '</h2>\n' +
      '    <div class="muted small">' + t("O'quvchilar uchun video filmlar") + '</div>\n' +
      '  </div>\n' +
      '  <button type="button" class="btn btn-primary btn-sm" data-lib-act="add-movie">+ ' + t("Film qo'shish") + '</button>\n' +
      '</div>\n' +
      (list.length ? list.map(movieCardTeacher).join('') : emptyState("Hozircha film yo'q", 'video'));
  }

  function resourceCardTeacher(r) {
    var files = r.files || [];
    return '<div class="card lib-card">\n' +
      '  <div class="row between lib-card-head">\n' +
      '    <div class="col">\n' +
      '      <strong>' + esc(r.title) + '</strong>\n' +
      '      <span class="chip-class">' + esc(groupName(r.groupId) || '—') + '</span>\n' +
      '    </div>\n' +
      '    <button type="button" class="btn btn-xs danger" data-lib-act="del-resource" data-id="' + esc(r.id) + '" aria-label="' + esc(t("O'chirish")) + '">' + libIco('trash', 14) + '</button>\n' +
      '  </div>\n' +
      '  <div class="muted small">' + files.length + ' ta fayl · ' + fmtDMY(String(r.createdAt || '').slice(0, 10)) + '</div>\n' +
      '  <div class="lib-file-list">' + files.map(fileRowHTML).join('') + '</div>\n' +
      '</div>';
  }

  function movieCardTeacher(m) {
    var meta = cuesMetaAll().filter(function (c) { return String(c.movieDbId) === String(m.dbId); })[0];
    var subBadge = meta && meta.status === 'ready'
      ? '<span class="pill lib-sub-ok">' + libIco('cc', 12) + ' ' + esc(meta.lang || 'sub') + '</span>'
      : (meta && (meta.status === 'pending' || meta.status === 'processing')
        ? '<span class="pill lib-sub-wait">' + libIco('cc', 12) + ' ' + esc(t('Tayyorlanmoqda')) + '</span>'
        : '<span class="pill lib-sub-none">' + libIco('cc', 12) + ' ' + esc(t('Subtitr yo\'q')) + '</span>');
    return '<div class="card lib-card">\n' +
      '  <div class="row between lib-card-head">\n' +
      '    <div class="col">\n' +
      '      <strong>' + esc(m.title) + '</strong>\n' +
      '      <span class="chip-class">' + esc(groupName(m.groupId) || '—') + '</span>\n' +
      '    </div>\n' +
      '    <button type="button" class="btn btn-xs danger" data-lib-act="del-movie" data-id="' + esc(m.id) + '" aria-label="' + esc(t("O'chirish")) + '">' + libIco('trash', 14) + '</button>\n' +
      '  </div>\n' +
      '  <div class="row between lib-movie-meta">\n' +
      '    <span class="muted small">' + fmtDMY(String(m.createdAt || '').slice(0, 10)) + '</span>\n' +
      '    ' + subBadge + '\n' +
      '  </div>\n' +
      '  <button type="button" class="btn btn-ghost btn-sm btn-block" data-lib-act="movie-open" data-id="' + esc(m.id) + '">' + libIco('play', 15) + ' ' + t('Ko\'rish') + '</button>\n' +
      '</div>';
  }

  function fileRowHTML(f) {
    var kind = f.type || libFileKind({ name: f.name, type: '' });
    return '<div class="lib-file-row">\n' +
      '  <span class="lib-file-ico">' + libIco('file', 15) + '</span>\n' +
      '  <span class="lib-file-body">\n' +
      '    <span class="lib-file-name">' + esc(f.name || t('Fayl')) + '</span>\n' +
      '    <span class="lib-file-meta">' + esc(libKindLabel(kind)) + (f.size ? ' · ' + fmtFileSize(f.size) : '') + '</span>\n' +
      '  </span>\n' +
      '  <a class="btn btn-xs ghost" href="' + esc(f.url) + '" target="_blank" rel="noopener" download>' + libIco('download', 14) + '</a>\n' +
      '</div>';
  }

  /* ---------------- ustoz: manba qo'shish ---------------- */
  function openResourceModal() {
    if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
    var groups = tutoringGroups();
    if (!groups.length) { toast("Repititorlik guruhi topilmadi", 'error'); return; }
    openModal(
      '<div class="modal-head">\n' +
      '  <h3>' + libIco('folder', 17) + ' ' + t("Foydali manba qo'shish") + '</h3>\n' +
      '  <button type="button" class="icon-btn" data-act="close-modal" aria-label="' + esc(t('Yopish')) + '">✕</button>\n' +
      '</div>\n' +
      '<label class="field-label" for="lib-res-group">' + t('Guruh') + '</label>\n' +
      '<select class="input" id="lib-res-group">' + groups.map(function (g) {
        return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>';
      }).join('') + '</select>\n' +
      '<label class="field-label" for="lib-res-title" style="margin-top:8px">' + t('Nomi') + '</label>\n' +
      '<input class="input" id="lib-res-title" type="text" placeholder="' + esc(t('Masalan: Grammar qo\'llanma')) + '" />\n' +
      '<label class="field-label" for="lib-res-files" style="margin-top:8px">' + t('Fayllar') + '</label>\n' +
      '<input class="input hw-file-input" id="lib-res-files" type="file" multiple />\n' +
      '<p class="muted small" id="lib-res-hint">' + t('PDF, Word, Excel, PowerPoint, rasm, video va boshqa fayllar') + '</p>\n' +
      '<div class="field-error" id="lib-res-error"></div>\n' +
      '<div class="modal-actions">\n' +
      '  <button type="button" class="btn btn-ghost" data-act="close-modal">' + t('Bekor qilish') + '</button>\n' +
      '  <button type="button" class="btn btn-primary" data-lib-act="save-resource">' + libIco('upload', 15) + ' ' + t('Yuklash') + '</button>\n' +
      '</div>'
    );
  }

  function libErrText(e) {
    var m = String((e && (e.message || e.error || e.details)) || e || 'xatolik');
    if (/could not find the table|does not exist|schema cache|PGRST205/i.test(m)) {
      m += " — Supabase'da supabase.sql 18-bo'limini Run qiling";
    }
    return m;
  }
  function libShowError(text) {
    var el = $('#lib-res-error') || $('#lib-movie-error') || $('#lib-del-error');
    if (el) { el.textContent = text; el.classList.add('show'); }
    else toast(text, 'error');
  }

  async function saveResource() {
    if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
    var gsel = $('#lib-res-group');
    var tInp = $('#lib-res-title');
    var fInp = $('#lib-res-files');
    var gid = gsel ? gsel.value : '';
    var g = groupById(gid);
    var gdb = g && g.dbId != null ? g.dbId : null;
    var files = fInp && fInp.files ? Array.prototype.slice.call(fInp.files) : [];
    var title = String((tInp && tInp.value) || '').trim();
    if (!g || gdb == null) { libShowError("Guruhni tanlang"); return; }
    if (!files.length) { libShowError("Kamida bitta fayl tanlang"); return; }
    if (!title) title = files[0].name || 'Manba';
    var c = libClient();
    if (!c) { libShowError("Baza bilan aloqa yo'q"); return; }

    var btn = $('[data-lib-act="save-resource"]');
    var hint = $('#lib-res-hint');
    if (btn) btn.disabled = true;
    var uploaded = [];
    try {
      for (var i = 0; i < files.length; i++) {
        if (hint) hint.textContent = t('Yuklanmoqda') + ' ' + (i + 1) + '/' + files.length + '…';
        var up = await uploadFileToR2(files[i], 'library/' + gdb + '/resources');
        uploaded.push({ url: up.url, type: libFileKind(files[i]), name: files[i].name || up.name || '', size: Number(files[i].size) || 0 });
      }
      var mode = await libStoreMode(c);
      var row;
      if (mode === 'kv') {
        var kid = libKvId('r');
        var rawRes = { id: kid, group_id: gdb, title: title, files: uploaded, created_at: new Date().toISOString() };
        await libKvPut(c, KV.res + kid, rawRes);
        row = mapResource(rawRes);
      } else {
        var res = await c.from('library_resources').insert({
          group_id: gdb, title: title, files: uploaded
        }).select();
        if (res.error) throw res.error;
        row = mapResource((res.data && res.data[0]) || { id: 'local' + Date.now(), group_id: gdb, title: title, files: uploaded });
      }
      writeList(KEYS.resources, [row].concat(resourcesAll().filter(function (x) { return x.id !== row.id; })));
      try { await notifyResourceAdded(row, uploaded.length); } catch (e) { /* xabar ixtiyoriy */ }
      closeModal();
      render();
      toast("Manba qo'shildi ✓");
    } catch (e) {
      await deleteCloudFiles(uploaded.map(function (u) { return u.url; }));
      if (hint) hint.textContent = t('PDF, Word, Excel, PowerPoint, rasm, video va boshqa fayllar');
      if (btn) btn.disabled = false;
      libShowError("Yuklab bo'lmadi: " + libErrText(e));
    }
  }

  /* ---------------- ustoz: film qo'shish ---------------- */
  /* Fayl tanlash: yashirin input + ko'rinadigan tugma (native input "oddiy matn"
     bo'lib ko'rinmasin, fayl nomi esa tanlanganda ko'rsatiladi) */
  function libPickHTML(id, btnText, accept, emptyText) {
    return '<div class="lib-pick">\n' +
      '<input class="hw-file-input" id="' + id + '" type="file"' + (accept ? ' accept="' + esc(accept) + '"' : '') + ' />\n' +
      '<label class="lib-pick-btn" for="' + id + '">' + libIco('upload', 15) + ' <span>' + esc(btnText) + '</span></label>\n' +
      '<div class="lib-pick-name" id="' + id + '-name">' + esc(emptyText) + '</div>\n' +
      '</div>';
  }
  function openMovieModal() {
    if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
    var groups = tutoringGroups();
    if (!groups.length) { toast("Repititorlik guruhi topilmadi", 'error'); return; }
    openModal(
      '<div class="modal-head">\n' +
      '  <h3>' + libIco('film', 17) + ' ' + t("Film qo'shish") + '</h3>\n' +
      '  <button type="button" class="icon-btn" data-act="close-modal" aria-label="' + esc(t('Yopish')) + '">✕</button>\n' +
      '</div>\n' +
      '<label class="field-label" for="lib-movie-group">' + t('Guruh') + '</label>\n' +
      '<select class="input" id="lib-movie-group">' + groups.map(function (g) {
        return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>';
      }).join('') + '</select>\n' +
      '<label class="field-label" for="lib-movie-title" style="margin-top:8px">' + t('Film nomi') + '</label>\n' +
      '<input class="input" id="lib-movie-title" type="text" placeholder="' + esc(t('Masalan: The Pursuit of Happyness')) + '" />\n' +
      '<label class="field-label" style="margin-top:8px">' + t('Video fayl') + '</label>\n' +
      libPickHTML('lib-movie-file', t('Video faylni tanlash'), 'video/*,.mp4,.mkv,.mov,.avi,.webm,.m4v,.3gp,.wmv', t('Fayl tanlanmagan')) +
      '<label class="field-label" style="margin-top:8px">' + t('Subtitr fayli (ixtiyoriy)') + '</label>\n' +
      libPickHTML('lib-movie-subs', t('Subtitr faylini tanlash (.vtt / .srt)'), '.vtt,.srt,text/vtt,text/plain', t('Fayl tanlanmagan')) +
      '<p class="muted small" id="lib-movie-hint">' + t('Subtitr yuklanmasa, o\'quvchi yoqqanda avtomatik tayyorlanadi') + '</p>\n' +
      '<div class="field-error" id="lib-movie-error"></div>\n' +
      '<div class="modal-actions">\n' +
      '  <button type="button" class="btn btn-ghost" data-act="close-modal">' + t('Bekor qilish') + '</button>\n' +
      '  <button type="button" class="btn btn-primary" data-lib-act="save-movie">' + libIco('upload', 15) + ' ' + t('Yuklash') + '</button>\n' +
      '</div>'
    );
  }

  /* Faylni matn sifatida o'qish: FileReader (brauzer + jsdom) yoki Blob.text() */
  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof FileReader === 'function') {
          var fr = new FileReader();
          fr.onload = function () { resolve(String(fr.result == null ? '' : fr.result)); };
          fr.onerror = function () { reject((fr && fr.error) || new Error("faylni o'qib bo'lmadi")); };
          fr.readAsText(file);
        } else if (file && typeof file.text === 'function') {
          file.text().then(resolve, reject);
        } else {
          reject(new Error("faylni o'qib bo'lmadi"));
        }
      } catch (e) { reject(e); }
    });
  }

  async function saveMovie() {
    if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
    var gsel = $('#lib-movie-group');
    var tInp = $('#lib-movie-title');
    var vInp = $('#lib-movie-file');
    var sInp = $('#lib-movie-subs');
    var gid = gsel ? gsel.value : '';
    var g = groupById(gid);
    var gdb = g && g.dbId != null ? g.dbId : null;
    var video = vInp && vInp.files ? vInp.files[0] : null;
    var subFile = sInp && sInp.files ? sInp.files[0] : null;
    var title = String((tInp && tInp.value) || '').trim();
    if (!g || gdb == null) { libShowError("Guruhni tanlang"); return; }
    if (!video) { libShowError("Video faylni tanlang"); return; }
    if (!/^video\//i.test(String(video.type || '')) && !/\.(mp4|mkv|mov|avi|webm|m4v|3gp|wmv)$/i.test(video.name || '')) {
      libShowError("Faqat video fayl yuklash mumkin"); return;
    }
    if (!title) title = String(video.name || '').replace(/\.[a-z0-9]{1,8}$/i, '') || 'Film';
    var c = libClient();
    if (!c) { libShowError("Baza bilan aloqa yo'q"); return; }

    var btn = $('[data-lib-act="save-movie"]');
    var hint = $('#lib-movie-hint');
    if (btn) btn.disabled = true;
    var videoUp = null;
    var cues = [];
    try {
      if (subFile) {
        var subText = await readFileText(subFile);
        var parsed = libParseCues(subText);
        if (!parsed.ok) throw new Error("Subtitr fayli noto'g'ri (VTT yoki SRT kerak)");
        cues = parsed.cues;
      }
      if (hint) hint.textContent = t('Video yuklanmoqda…');
      videoUp = await uploadFileToR2(video, 'library/' + gdb + '/movies');

      var mode = await libStoreMode(c);
      var row;
      if (mode === 'kv') {
        var mid = libKvId('m');
        var rawMov = {
          id: mid, group_id: gdb, title: title,
          video_url: videoUp.url, video_name: String(video.name || ''),
          created_at: new Date().toISOString()
        };
        await libKvPut(c, KV.mov + mid, rawMov);
        row = mapMovie(rawMov);
      } else {
        var res = await c.from('library_movies').insert({
          group_id: gdb,
          title: title,
          video_url: videoUp.url,
          video_name: String(video.name || '')
        }).select();
        if (res.error) throw res.error;
        row = mapMovie((res.data && res.data[0]) || { id: 'local' + Date.now(), group_id: gdb, title: title, video_url: videoUp.url });
      }
      writeList(KEYS.movies, [row].concat(moviesAll().filter(function (x) { return x.id !== row.id; })));

      if (cues.length && row.dbId != null) {
        if (mode === 'kv') {
          await libKvDelete(c, KV.cue + row.dbId + '_*');
          await libKvPut(c, KV.cue + row.dbId + '_ready_manual',
            { lang: 'manual', cues: cues, updated_at: new Date().toISOString() });
          writeList(KEYS.cues, cuesMetaAll().filter(function (x) { return String(x.movieDbId) !== String(row.dbId); })
            .concat([mapCueMeta({ id: 'k' + row.dbId, movie_id: row.dbId, lang: 'manual', status: 'ready' })]));
        } else {
          var cRes = await c.from('library_movie_cues').insert({
            movie_id: row.dbId, lang: 'manual', status: 'ready', cues: cues
          }).select();
          if (!cRes.error) {
            writeList(KEYS.cues, cuesMetaAll().concat([mapCueMeta(cRes.data[0])]));
          } else {
            /* Subtitr saqlanmasa "subtitle tugmasi bosilganda hech narsa chiqmaydi" bo'lib qolmasin */
            toast(t('Film yuklandi, lekin subtitr saqlanmadi: ') + libErrText(cRes.error), 'error');
          }
        }
      }
      try { await notifyMovieAdded(row); } catch (e) { /* xabar ixtiyoriy */ }
      closeModal();
      render();
      toast("Film qo'shildi ✓");
    } catch (e) {
      if (videoUp) await deleteCloudFiles([videoUp.url]);
      if (hint) hint.textContent = t('Subtitr yuklanmasa, o\'quvchi yoqqanda avtomatik tayyorlanadi');
      if (btn) btn.disabled = false;
      libShowError("Yuklab bo'lmadi: " + libErrText(e));
    }
  }

  /* ---------------- o'chirish modallari ---------------- */
  function confirmDelete(kind, id) {
    if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
    var row = kind === 'resource'
      ? resourcesAll().filter(function (x) { return x.id === id; })[0]
      : moviesAll().filter(function (x) { return x.id === id; })[0];
    if (!row) return;
    openModal(
      '<div class="modal-head"><h3>' + (kind === 'resource' ? t("Manbani o'chirish") : t("Filmni o'chirish")) + '</h3>' +
      '<button type="button" class="icon-btn" data-act="close-modal" aria-label="' + esc(t('Yopish')) + '">✕</button></div>\n' +
      '<p><b>' + esc(row.title) + '</b> ' + t('butunlay o\'chiriladi: fayl xotiradan (baza va saqlashdan) ham yo\'qoladi.') + '</p>\n' +
      '<div class="field-error" id="lib-del-error"></div>\n' +
      '<div class="modal-actions">\n' +
      '  <button type="button" class="btn btn-ghost" data-act="close-modal">' + t('Bekor qilish') + '</button>\n' +
      '  <button type="button" class="btn btn-danger" data-lib-act="do-del-' + kind + '" data-id="' + esc(id) + '">' + libIco('trash', 15) + ' ' + t("Ha, o'chirish") + '</button>\n' +
      '</div>'
    );
  }

  async function doDeleteResource(id) {
    var row = resourcesAll().filter(function (x) { return x.id === id; })[0];
    if (!row) return;
    var btn = $('[data-lib-act="do-del-resource"]');
    if (btn) btn.disabled = true;
    try {
      await deleteCloudFiles((row.files || []).map(function (f) { return f.url; }));
      if (row.dbId != null) {
        var c = libClient();
        if (c) {
          var mode = await libStoreMode(c);
          if (mode === 'kv') {
            await libKvDelete(c, KV.res + row.dbId);
          } else {
            var res = await c.from('library_resources').delete().eq('id', row.dbId);
            if (res.error) throw res.error;
          }
        }
      }
      writeList(KEYS.resources, resourcesAll().filter(function (x) { return x.id !== id; }));
      closeModal();
      render();
      toast("Manba butunlay o'chirildi");
    } catch (e) {
      if (btn) btn.disabled = false;
      libShowError("O'chirib bo'lmadi: " + ((e && (e.message || e.error || e)) || 'xatolik'));
    }
  }

  async function doDeleteMovie(id) {
    var row = moviesAll().filter(function (x) { return x.id === id; })[0];
    if (!row) return;
    var btn = $('[data-lib-act="do-del-movie"]');
    if (btn) btn.disabled = true;
    try {
      await deleteCloudFiles([row.videoUrl]);
      var c = libClient();
      if (c && row.dbId != null) {
        var mode = await libStoreMode(c);
        if (mode === 'kv') {
          await libKvDelete(c, KV.mov + row.dbId);
          await libKvDelete(c, KV.cue + row.dbId + '_*');
          await libKvDelete(c, KV.watch + row.dbId + '_*');
        } else {
          try { await c.from('library_movie_watch').delete().eq('movie_id', row.dbId); } catch (e) {}
          try { await c.from('library_movie_cues').delete().eq('movie_id', row.dbId); } catch (e) {}
          var res = await c.from('library_movies').delete().eq('id', row.dbId);
          if (res.error) throw res.error;
        }
      }
      writeList(KEYS.movies, moviesAll().filter(function (x) { return x.id !== id; }));
      writeList(KEYS.cues, cuesMetaAll().filter(function (x) { return String(x.movieDbId) !== String(row.dbId); }));
      writeList(KEYS.watch, watchAll().filter(function (x) { return String(x.movieDbId) !== String(row.dbId); }));
      if (state.libMovieId === id) state.libMovieId = '';
      closeModal();
      render();
      toast("Film butunlay o'chirildi");
    } catch (e) {
      if (btn) btn.disabled = false;
      libShowError("O'chirib bo'lmadi: " + ((e && (e.message || e.error || e)) || 'xatolik'));
    }
  }

  /* ---------------- o'quvchi: manbalar ---------------- */
  function studentResourcesHTML(st) {
    libRefreshIf(state.screen);
    var list = resourcesAll().filter(function (r) { return String(r.groupId) === String(st.groupId); })
      .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    if (!list.length) return emptyState("Hozircha foydali manba yo'q", 'folder');
    return list.map(function (r) {
      return '<div class="card lib-card">\n' +
        '  <div class="lib-card-head"><strong>' + esc(r.title) + '</strong></div>\n' +
        '  <div class="muted small">' + fmtDMY(String(r.createdAt || '').slice(0, 10)) + '</div>\n' +
        '  <div class="lib-file-list">' + (r.files || []).map(studentFileHTML).join('') + '</div>\n' +
        '</div>';
    }).join('');
  }

  function studentFileHTML(f) {
    var kind = f.type || libFileKind({ name: f.name, type: '' });
    var media = '';
    if (kind === 'image') {
      media = '<a href="' + esc(f.url) + '" target="_blank" rel="noopener" class="lib-file-img"><img src="' + esc(f.url) + '" alt="' + esc(f.name || 'Rasm') + '" loading="lazy" /></a>';
    } else if (kind === 'video') {
      media = '<video class="lib-file-video" controls playsinline preload="metadata" src="' + esc(f.url) + '"></video>';
    } else if (kind === 'audio') {
      media = '<audio class="lib-file-audio" controls preload="metadata" src="' + esc(f.url) + '"></audio>';
    }
    return '<div class="lib-file-item">' +
      '<div class="lib-file-row">' +
      '<span class="lib-file-ico">' + libIco('file', 15) + '</span>' +
      '<span class="lib-file-body"><span class="lib-file-name">' + esc(f.name || t('Fayl')) + '</span>' +
      '<span class="lib-file-meta">' + esc(libKindLabel(kind)) + (f.size ? ' · ' + fmtFileSize(f.size) : '') + '</span></span>' +
      '<a class="btn btn-xs ghost" href="' + esc(f.url) + '" target="_blank" rel="noopener" download>' + libIco('download', 14) + '</a>' +
      '</div>' + media + '</div>';
  }

  /* ---------------- o'quvchi: filmlar ---------------- */
  function studentMoviesHTML(st) {
    if (state.libMovieId) {
      var m = moviesAll().filter(function (x) { return x.id === state.libMovieId; })[0];
      if (m) return moviePlayerHTML(m, st);
      state.libMovieId = '';
    }
    libRefreshIf(state.screen);
    var list = moviesAll().filter(function (x) { return String(x.groupId) === String(st.groupId); })
      .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    if (!list.length) return emptyState("Hozircha film yo'q", 'video');
    return list.map(function (m) {
      var w = watchFor(m.dbId, st.id);
      var mins = Math.floor((w ? w.seconds : 0) / 60);
      return '<div class="card lib-card">\n' +
        '  <div class="lib-card-head"><strong>' + libIco('film', 15) + ' ' + esc(m.title) + '</strong></div>\n' +
        '  <div class="muted small">' + (mins ? t('Ko\'rilgan:') + ' ' + mins + ' ' + t('daqiqa') : t("Hali ko'rilmagan")) + '</div>\n' +
        '  <button type="button" class="btn btn-primary btn-sm btn-block" data-lib-act="movie-open" data-id="' + esc(m.id) + '">' + libIco('play', 15) + ' ' + t('Ko\'rish') + '</button>\n' +
        '</div>';
    }).join('');
  }

  function watchFor(movieDbId, sid) {
    var key = String(movieDbId) + ':' + String(sid);
    return watchAll().filter(function (w) { return String(w.movieDbId) + ':' + String(w.sid) === key; })[0] || null;
  }

  function moviePlayerHTML(m, st) {
    var w = st ? watchFor(m.dbId, st.id) : null;
    var watched = Math.floor(((w && w.seconds) || 0) / 60);
    return '<div class="lib-player-wrap" id="lib-player-wrap">\n' +
      '  <div class="lib-player-top">\n' +
      '    <button type="button" class="btn btn-xs ghost" data-lib-act="movie-back">' + libIco('close', 14) + ' ' + t('Orqaga') + '</button>\n' +
      '    <span class="lib-player-title">' + esc(m.title) + '</span>\n' +
      '  </div>\n' +
      '  <div class="lib-video-box">\n' +
      '    <video id="lib-movie-video" playsinline preload="metadata" src="' + esc(m.videoUrl) + '"></video>\n' +
      '    <div class="lib-subtitle" id="lib-subtitle" hidden></div>\n' +
      '    <div class="lib-subtitle-status" id="lib-subtitle-status" hidden></div>\n' +
      '  </div>\n' +
      '  <div class="lib-controls">\n' +
      '    <button type="button" class="lib-ctrl" data-lib-act="ply-play" aria-label="' + esc(t('Ijro / pauza')) + '"><span id="lib-ico-play">' + libIco('play', 20) + '</span></button>\n' +
      '    <button type="button" class="lib-ctrl" data-lib-act="ply-back" aria-label="-10">' + libIco('back10', 22) + '</button>\n' +
      '    <button type="button" class="lib-ctrl" data-lib-act="ply-fwd" aria-label="+10">' + libIco('fwd10', 22) + '</button>\n' +
      '    <input class="lib-progress" id="lib-progress" type="range" min="0" max="1000" value="0" step="1" aria-label="' + esc(t('Vaqt')) + '" />\n' +
      '    <span class="lib-time" id="lib-time">0:00 / 0:00</span>\n' +
      '    <button type="button" class="lib-ctrl lib-cc" id="lib-btn-cc" data-lib-act="ply-cc" aria-pressed="false" aria-label="' + esc(t('Subtitr')) + '">' + libIco('cc', 20) + '</button>\n' +
      '    <button type="button" class="lib-ctrl" data-lib-act="ply-fs" aria-label="' + esc(t("To'liq ekran")) + '">' + libIco('expand', 20) + '</button>\n' +
      '  </div>\n' +
      '  <div class="lib-watch-info" id="lib-watch-info">' + t('Uzluksiz ko\'rilgan:') + ' ' + watched + ' ' + t('daqiqa') + '</div>\n' +
      '</div>';
  }

  function fmtClock(sec) {
    var s = Math.max(0, Math.floor(Number(sec) || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(r).padStart(2, '0');
  }

  /* ---------------- pleyer: subtitr va ko'rish hisobi ---------------- */
  function initPlayer() {
    var vid = document.getElementById('lib-movie-video');
    if (!vid) { libPlayer = null; return; }
    if (libPlayer && libPlayer.video === vid) return;

    var m = moviesAll().filter(function (x) { return x.id === state.libMovieId; })[0];
    if (!m) { libPlayer = null; return; }
    var st = currentStudent();
    var w = st ? watchFor(m.dbId, st.id) : null;

    libPlayer = {
      video: vid,
      movie: m,
      sid: st ? st.id : '',
      student: st,
      total: (w && w.seconds) || 0,
      base: (w && w.seconds) || 0,
      streak: 0,
      milestone: 0,
      lastPos: Number(vid.currentTime) || 0,
      cues: [],
      subOn: false,
      seeking: false,
      lastSaveAt: 0,
      best: 0,
      notified: (w && w.seconds) || 0,
      pollTimer: null
    };
    stopSubsPolling();

    vid.addEventListener('timeupdate', onPlayerTime);
    vid.addEventListener('play', function () { setPlayBtn(true); });
    vid.addEventListener('pause', function () {
      setPlayBtn(false);
      breakStreak();
      saveWatch(true);
    });
    vid.addEventListener('seeking', function () {
      if (!libPlayer) return;
      libPlayer.seeking = true;
      breakStreak();
    });
    vid.addEventListener('seeked', function () {
      if (!libPlayer) return;
      libPlayer.seeking = false;
      libPlayer.lastPos = Number(vid.currentTime) || 0;
    });
    vid.addEventListener('ended', function () {
      setPlayBtn(false);
      breakStreak();
      saveWatch(true);
    });
    if (w && w.lastPosition > 5 && w.lastPosition < (Number(vid.duration) || Infinity)) {
      try { vid.currentTime = w.lastPosition; } catch (e) {}
    }

    var prog = $('#lib-progress');
    if (prog) {
      prog.addEventListener('input', function () {
        var dur = Number(vid.duration) || 0;
        if (!dur) return;
        vid.currentTime = (Number(prog.value) / 1000) * dur;
      });
    }

    var wrap = $('#lib-player-wrap');
    if (wrap && !wrap.__libBound) {
      wrap.__libBound = true;
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-lib-act]') : null;
        if (!b || !libPlayer) return;
        var act = b.getAttribute('data-lib-act');
        if (act === 'ply-play') togglePlay();
        else if (act === 'ply-back') seekBy(-10);
        else if (act === 'ply-fwd') seekBy(10);
        else if (act === 'ply-cc') toggleSubs();
        else if (act === 'ply-fs') toggleFullscreen();
      });
      vid.addEventListener('click', togglePlay);
      vid.addEventListener('dblclick', toggleFullscreen);
    }
    updateTimeUI();
    restoreCues();
    restoreWatchFromCloud(m, st);
  }

  /* Boshqa qurilmada ko'rilgan vaqt yo'qolmasin: bulutdagi kattaroq qiymatni olamiz */
  async function cloudWatchGet(c, movieDbId, studentId) {
    var mode = await libStoreMode(c);
    if (mode === 'kv') {
      var row = await libKvGet(c, KV.watch + movieDbId + '_' + studentId);
      return row ? { seconds: Number(row.seconds) || 0 } : null;
    }
    var res = await c.from('library_movie_watch').select('*')
      .eq('movie_id', movieDbId).eq('student_id', studentId).limit(1);
    return res && !res.error && res.data ? res.data[0] : null;
  }
  function restoreWatchFromCloud(movie, st) {
    var c = libClient();
    if (!c || !movie || !st || movie.dbId == null || st.dbId == null) return;
    cloudWatchGet(c, movie.dbId, st.dbId)
      .then(function (row) {
        if (!row || !libPlayer) return;
        var cloudSec = Number(row.seconds) || 0;
        var session = Math.max(0, libPlayer.total - libPlayer.base);
        if (cloudSec + session > libPlayer.total) {
          libPlayer.total = cloudSec + session;
          libPlayer.base = cloudSec;
          updateTimeUI();
        }
      }).catch(function () {});
  }

  function setPlayBtn(playing) {
    var box = document.getElementById('lib-ico-play');
    if (box) box.innerHTML = libIco(playing ? 'pause' : 'play', 20);
  }
  function togglePlay() {
    var v = libPlayer && libPlayer.video;
    if (!v) return;
    if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    else v.pause();
  }
  function seekBy(delta) {
    var v = libPlayer && libPlayer.video;
    if (!v) return;
    breakStreak();
    var dur = Number(v.duration) || 0;
    var next = Math.max(0, Math.min(dur || (v.currentTime + delta), v.currentTime + delta));
    v.currentTime = next;
    libPlayer.lastPos = next;
  }
  function breakStreak() {
    if (!libPlayer) return;
    libPlayer.streak = 0;
    libPlayer.milestone = 0;
  }
  /* Uzluksiz ko'rish hisobi (test uchun alohida sof funksiya).
     Faqat haqiqiy ijro davomidagi 0 < delta <= 1.5 s qo'shiladi:
     pauza, orqaga/oldinga o'tkazish oqimni uzadi va hisoblanmaydi. */
  function libWatchStep(p, ct, playing, seeking) {
    if (!p) return p;
    var now = Number(ct) || 0;
    if (playing && !seeking) {
      var d = now - p.lastPos;
      if (d > 0 && d <= 1.5) {
        p.total += d;
        p.streak += d;
        if (!p.best || p.streak > p.best) p.best = p.streak;
      } else if (d > 1.5 || d < 0) {
        p.streak = 0;
        p.milestone = 0;
      }
    }
    p.lastPos = now;
    return p;
  }
  function onPlayerTime() {
    if (!libPlayer) return;
    var v = libPlayer.video;
    var ct = Number(v.currentTime) || 0;
    libWatchStep(libPlayer, ct, !v.paused, v.seeking || libPlayer.seeking);
    updateTimeUI();
    updateSubtitleText();
    if (libPlayer.streak >= (libPlayer.milestone + 1) * WATCH_NOTIFY_EVERY_SEC) {
      libPlayer.milestone += 1;
      if (libPlayer.student) {
        libPlayer.notified = libPlayer.total;
        notifyWatch(libPlayer.movie, libPlayer.student, libPlayer.streak, libPlayer.total);
      }
      saveWatch(true);
    } else if (Date.now() - libPlayer.lastSaveAt > 30000) {
      saveWatch(false);
    }
  }
  function updateTimeUI() {
    var v = libPlayer && libPlayer.video;
    if (!v) return;
    var cur = Number(v.currentTime) || 0;
    var dur = Number(v.duration) || 0;
    var time = document.getElementById('lib-time');
    if (time) time.textContent = fmtClock(cur) + ' / ' + fmtClock(dur);
    var prog = document.getElementById('lib-progress');
    if (prog && dur) prog.value = String(Math.round((cur / dur) * 1000));
    var info = document.getElementById('lib-watch-info');
    if (info && libPlayer.student) {
      var mins = Math.floor(libPlayer.total / 60);
      info.textContent = t('Uzluksiz ko\'rilgan:') + ' ' + Math.floor(libPlayer.streak / 60) + ' ' +
        t('daqiqa') + ' · ' + t('Jami:') + ' ' + mins + ' ' + t('daqiqa');
    }
  }
  function saveWatch(notifyStopped) {
    if (!libPlayer || !libPlayer.student) return;
    var w = libPlayer;
    var list = watchAll();
    var key = String(w.movie.dbId) + ':' + String(w.sid);
    var rec = list.filter(function (x) { return String(x.movieDbId) + ':' + String(x.sid) === key; })[0];
    if (!rec) {
      rec = { id: 'local' + Date.now(), sid: w.sid, movieDbId: w.movie.dbId, seconds: 0, streak: 0, lastPosition: 0, updatedAt: '' };
      list.push(rec);
    }
    rec.seconds = Math.round(w.total);
    rec.streak = Math.max(Number(rec.streak) || 0, Math.round(w.streak));
    rec.lastPosition = Math.round(Number(w.video.currentTime) || 0);
    rec.updatedAt = new Date().toISOString();
    writeList(KEYS.watch, list);
    w.lastSaveAt = Date.now();

    var c = libClient();
    var st = w.student;
    if (!c || !st || st.dbId == null || w.movie.dbId == null) return;
    var payload = {
      movie_id: w.movie.dbId,
      student_id: st.dbId,
      seconds: rec.seconds,
      streak_seconds: rec.streak,
      last_position: rec.lastPosition,
      updated_at: rec.updatedAt
    };
    (async function () {
      try {
        var mode = await libStoreMode(c);
        if (mode === 'kv') {
          await libKvPut(c, KV.watch + payload.movie_id + '_' + payload.student_id, payload);
          return;
        }
        if (rec.dbId != null) {
          await c.from('library_movie_watch').update(payload).eq('id', rec.dbId);
        } else {
          var res = await c.from('library_movie_watch').insert(payload).select();
          if (!res.error && res.data && res.data[0]) {
            rec.dbId = res.data[0].id;
            writeList(KEYS.watch, watchAll());
          }
        }
      } catch (e) { /* keyingi safar qayta yuboriladi */ }
    })();
  }

  function toggleFullscreen() {
    var wrap = document.getElementById('lib-player-wrap');
    var v = libPlayer && libPlayer.video;
    if (!wrap && !v) return;
    try {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        if (wrap.requestFullscreen) wrap.requestFullscreen().then(lockLandscape).catch(fallbackVideoFs);
        else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
        else fallbackVideoFs();
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch (e) { fallbackVideoFs(); }
    function fallbackVideoFs() {
      if (v && v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); } catch (e) {} }
    }
    function lockLandscape() {
      try {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
      } catch (e) {}
    }
  }

  /* ---------------- subtitrlar ---------------- */
  function libParseCues(text) {
    var raw = String(text == null ? '' : text)
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n');
    if (!raw.trim()) return { ok: false, cues: [], reason: "bo'sh" };
    var blocks = raw.split(/\n{2,}/);
    var cues = [];
    var bad = 0;
    blocks.forEach(function (block) {
      var lines = block.split('\n').filter(function (l) { return String(l).trim() !== ''; });
      if (!lines.length) return;
      if (/^WEBVTT\b/i.test(lines[0].trim())) lines.shift();
      while (lines.length && /^(NOTE|STYLE|REGION)\b/i.test(lines[0].trim())) return;
      if (!lines.length) return;
      var idx = 0;
      if (/^\d+$/.test(lines[0].trim())) idx = 1;
      var tl = String(lines[idx] || '');
      var mt = tl.match(/(\d{1,3}):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->\s*(\d{1,3}):(\d{2}):(\d{2})[.,](\d{1,3})/);
      if (!mt) { bad++; return; }
      var a = (Number(mt[1]) * 3600) + (Number(mt[2]) * 60) + Number(mt[3]) + (Number(mt[4].padEnd(3, '0')) / 1000);
      var b = (Number(mt[5]) * 3600) + (Number(mt[6]) * 60) + Number(mt[7]) + (Number(mt[8].padEnd(3, '0')) / 1000);
      var txt = lines.slice(idx + 1).join('\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\{\\[^}]*\}/g, '')
        .trim();
      if (!txt) { bad++; return; }
      if (!isFinite(a) || !isFinite(b)) { bad++; return; }
      if (b <= a) { bad++; return; }
      if (b - a > 3600) { bad++; return; }
      cues.push({ start: Math.round(a * 1000) / 1000, end: Math.round(b * 1000) / 1000, text: txt });
    });
    if (!cues.length) return { ok: false, cues: [], reason: 'vaqt belgilari topilmadi' };
    if (bad > cues.length) return { ok: false, cues: [], reason: "ko'p buzuq bloklar" };
    cues.sort(function (x, y) { return x.start - y.start || x.end - y.end; });
    var out = [];
    cues.forEach(function (c) {
      var last = out[out.length - 1];
      if (last && c.start < last.start) return;
      if (last && c.start === last.start && c.text === last.text) return;
      out.push(c);
    });
    return { ok: true, cues: out.slice(0, 10000), reason: '' };
  }

  function cuesRowFor(movieDbId) {
    var meta = cuesMetaAll().filter(function (c) { return String(c.movieDbId) === String(movieDbId); })[0];
    return meta || null;
  }

  async function fetchCues(movieDbId) {
    var c = libClient();
    if (!c || movieDbId == null) return null;
    try {
      var mode = await libStoreMode(c);
      if (mode === 'kv') {
        var rows = await libKvList(c, KV.cue + movieDbId + '_*');
        if (!rows.length) return null;
        rows.sort(function (a, b) { return (/ready/.test(a.key) ? 0 : 1) - (/ready/.test(b.key) ? 0 : 1); });
        var krow = rows[0];
        var p = libCueParts(krow.key, movieDbId);
        var data = libKvParse(krow) || {};
        return {
          status: p.status,
          lang: data.lang || p.lang || '',
          error: data.error || '',
          cues: normCues(data.cues)
        };
      }
      var res = await c.from('library_movie_cues').select('*').eq('movie_id', movieDbId).limit(1);
      if (res.error || !res.data || !res.data[0]) return null;
      var row = res.data[0];
      var parsed = normCues(row.cues);
      return { status: row.status || 'pending', lang: row.lang || '', error: row.error || '', cues: parsed };
    } catch (e) { return null; }
  }
  function normCues(raw) {
    var v = raw;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
    if (!Array.isArray(v)) return [];
    return v.filter(function (c) {
      return c && isFinite(Number(c.start)) && isFinite(Number(c.end)) &&
        Number(c.end) > Number(c.start) && String(c.text || '').trim();
    }).map(function (c) {
      return { start: Number(c.start), end: Number(c.end), text: String(c.text).trim() };
    }).sort(function (a, b) { return a.start - b.start; });
  }

  function subStatusEl() { return document.getElementById('lib-subtitle-status'); }
  function setSubStatus(text) {
    var el = subStatusEl();
    if (!el) return;
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = text;
  }
  function updateSubtitleText() {
    var el = document.getElementById('lib-subtitle');
    if (!el || !libPlayer) return;
    if (!libPlayer.subOn) { el.hidden = true; return; }
    var ct = Number(libPlayer.video.currentTime) || 0;
    var cues = libPlayer.cues || [];
    var lo = 0, hi = cues.length - 1, found = null;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var c = cues[mid];
      if (ct < c.start) hi = mid - 1;
      else if (ct > c.end) lo = mid + 1;
      else { found = c; break; }
    }
    if (found) { el.textContent = found.text; el.hidden = false; }
    else { el.textContent = ''; el.hidden = true; }
  }
  function restoreCues() {
    if (!libPlayer || libPlayer.movie.dbId == null) return;
    fetchCues(libPlayer.movie.dbId).then(function (row) {
      if (!row || !libPlayer) return;
      if (row.status === 'ready' && row.cues.length) {
        libPlayer.cues = row.cues;
        if (libPlayer.subOn) updateSubtitleText();
      }
    });
  }
  async function toggleSubs() {
    if (!libPlayer) return;
    if (libPlayer.subOn) {
      libPlayer.subOn = false;
      setSubStatus('');
      updateSubtitleText();
      setCcPressed(false);
      return;
    }
    libPlayer.subOn = true;
    setCcPressed(true);
    if (libPlayer.cues && libPlayer.cues.length) { updateSubtitleText(); return; }
    if (libPlayer.movie.dbId == null) { setSubStatus(t('Subtitr mavjud emas')); return; }

    var row = await fetchCues(libPlayer.movie.dbId);
    if (!libPlayer || !libPlayer.subOn) return;
    if (row && row.status === 'ready' && row.cues.length) {
      libPlayer.cues = row.cues;
      setSubStatus('');
      updateSubtitleText();
      return;
    }
    setSubStatus(t('Subtitr tayyorlanmoqda…'));
    await ensureSubtitleJob(libPlayer.movie.dbId);
  }
  function setCcPressed(on) {
    var b = document.getElementById('lib-btn-cc');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (b) b.classList.toggle('is-on', !!on);
  }
  async function ensureSubtitleJob(movieDbId) {
    var c = libClient();
    if (!c) { setSubStatus(t('Subtitr mavjud emas')); return; }
    try {
      var mode = await libStoreMode(c);
      if (mode === 'kv') {
        var rows = await libKvList(c, KV.cue + movieDbId + '_*');
        var hasWork = rows.some(function (r) {
          var st = libCueParts(r.key, movieDbId).status;
          return st === 'pending' || st === 'processing' || st === 'ready';
        });
        var failed = rows.filter(function (r) { return libCueParts(r.key, movieDbId).status === 'failed'; });
        if (!rows.length) {
          await libKvPut(c, KV.cue + movieDbId + '_pending',
            { updated_at: new Date().toISOString() });
        } else if (!hasWork && failed.length) {
          await libKvDelete(c, KV.cue + movieDbId + '_failed');
          await libKvPut(c, KV.cue + movieDbId + '_pending',
            { updated_at: new Date().toISOString() });
        }
      } else {
        var existing = await c.from('library_movie_cues').select('*').eq('movie_id', movieDbId).limit(1);
        var row = existing.data && existing.data[0];
        if (!existing.error && !row) {
          await c.from('library_movie_cues').insert({ movie_id: movieDbId, status: 'pending', lang: 'auto' });
        } else if (row && row.status === 'failed') {
          /* Kalit keyin sozlangan bo'lsa — qayta urinish uchun qayta navbatga qo'yamiz */
          await c.from('library_movie_cues').update({
            status: 'pending', error: null, job_id: null, updated_at: new Date().toISOString()
          }).eq('movie_id', movieDbId);
        }
      }
    } catch (e) { /* quyida polling davom etadi */ }
    startSubsPolling(movieDbId);
  }
  function startSubsPolling(movieDbId) {
    stopSubsPolling();
    var tries = 0;
    libSubsPollMs(movieDbId, tries);
  }
  function libSubsPollMs(movieDbId, tries) {
    clearTimeout(libSubsTimer);
    libSubsTimer = setTimeout(async function () {
      if (!libPlayer || !libPlayer.subOn || libPlayer.movie.dbId !== movieDbId) return;
      tries++;
      var row = await fetchCues(movieDbId);
      if (!libPlayer || !libPlayer.subOn) return;
      if (row && row.status === 'ready' && row.cues.length) {
        libPlayer.cues = row.cues;
        setSubStatus('');
        updateSubtitleText();
        var meta = cuesMetaAll().filter(function (m) { return String(m.movieDbId) === String(movieDbId); })[0];
        if (meta) { meta.status = 'ready'; meta.lang = row.lang || meta.lang; writeList(KEYS.cues, cuesMetaAll()); }
        return;
      }
      if (row && row.status === 'failed') {
        setSubStatus(t('Avtomatik subtitr hozircha ishlamayapti. Ustoz subtitle fayli yuklashi mumkin.'));
        return;
      }
      if (tries >= SUBS_POLL_TRIES) {
        setSubStatus(t('Subtitr hali tayyor emas. Keyinroq qayta urinib ko\'ring.'));
        return;
      }
      setSubStatus(t('Subtitr tayyorlanmoqda…') + ' (' + Math.floor((tries * SUBS_POLL_MS) / 1000) + 's)');
      libSubsPollMs(movieDbId, tries);
    }, SUBS_POLL_MS);
  }
  function stopSubsPolling() {
    clearTimeout(libSubsTimer);
    libSubsTimer = null;
  }

  /* ---------------- render hook ---------------- */
  function libAfterRender(scr) {
    if (scr === 'resources' || scr === 'movies') libRefreshIf(scr);
    if (scr === 'movies') {
      if (state.libMovieId) initPlayer();
      else { libPlayer = null; stopSubsPolling(); }
      return;
    }
    if (scr !== 'home' || isTeacher() || isSupport()) {
      if (scr !== 'home' && !document.getElementById('lib-movie-video')) { libPlayer = null; stopSubsPolling(); }
      return;
    }
    if (state.studentView !== 'movies') {
      state.libMovieId = '';
      libPlayer = null;
      stopSubsPolling();
      return;
    }
    if (state.studentView === 'movies') {
      libRefreshIf('home');
      if (state.libMovieId) initPlayer();
    }
  }

  /* Tanlangan fayl nomi tanlash tugmasi ostida ko'rinadi */
  document.addEventListener('change', function (e) {
    var inp = e.target;
    if (!inp || !inp.id || ['lib-movie-file', 'lib-movie-subs'].indexOf(inp.id) < 0) return;
    var nameEl = document.getElementById(inp.id + '-name');
    if (!nameEl) return;
    var files = inp.files ? Array.prototype.slice.call(inp.files) : [];
    nameEl.textContent = files.length
      ? files.map(function (f) { return f.name; }).join(', ')
      : t('Fayl tanlanmagan');
    nameEl.classList.toggle('has-file', !!files.length);
  });

  /* ---------------- click handling ---------------- */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-lib-act]') : null;
    if (!b) return;
    var act = b.getAttribute('data-lib-act');
    var id = b.getAttribute('data-id') || '';
    if (act === 'add-resource') { e.preventDefault(); openResourceModal(); }
    else if (act === 'save-resource') { e.preventDefault(); saveResource(); }
    else if (act === 'del-resource') { e.preventDefault(); confirmDelete('resource', id); }
    else if (act === 'do-del-resource') { e.preventDefault(); doDeleteResource(id); }
    else if (act === 'add-movie') { e.preventDefault(); openMovieModal(); }
    else if (act === 'save-movie') { e.preventDefault(); saveMovie(); }
    else if (act === 'del-movie') { e.preventDefault(); confirmDelete('movie', id); }
    else if (act === 'do-del-movie') { e.preventDefault(); doDeleteMovie(id); }
    else if (act === 'movie-open') {
      e.preventDefault();
      state.libMovieId = id;
      if (!isStudentUser()) state.screen = 'movies';
      render();
      window.scrollTo(0, 0);
    } else if (act === 'movie-back') {
      e.preventDefault();
      if (libPlayer && libPlayer.student) {
        saveWatch(true);
        /* Sessiya yakunida ham xabar: faqat 1 daqiqadan ko'p yangi vaqt bo'lsa */
        if (libPlayer.total - libPlayer.notified >= 60) {
          libPlayer.notified = libPlayer.total;
          notifyWatch(libPlayer.movie, libPlayer.student,
            Math.max(libPlayer.best || 0, libPlayer.streak || 0), libPlayer.total);
        }
      }
      state.libMovieId = '';
      libPlayer = null;
      stopSubsPolling();
      render();
    }
  });

  /* ---------------- ro'yxatdan o'tkazish ---------------- */
  if (typeof SCREENS === 'object' && SCREENS) {
    SCREENS.resources = libResourcesScreen;
    SCREENS.movies = libMoviesScreen;
  }
  if (typeof TEACHER_SCREENS !== 'undefined' && Array.isArray(TEACHER_SCREENS)) {
    if (TEACHER_SCREENS.indexOf('resources') < 0) TEACHER_SCREENS.push('resources');
    if (TEACHER_SCREENS.indexOf('movies') < 0) TEACHER_SCREENS.push('movies');
  }

  /* Global API — app.js va testlar uchun */
  /* Ingliz tili rejimi uchun tarjimalar */
  if (typeof I18N_EN === 'object' && I18N_EN) {
    Object.assign(I18N_EN, {
      'Foydali manbalar': 'Useful resources',
      'Filmlar': 'Movies',
      'Repititorlik guruhlari uchun fayllar': 'Files for tutoring groups',
      "O'quvchilar uchun video filmlar": 'Video movies for students',
      "Manba qo'shish": 'Add resource',
      "Film qo'shish": 'Add movie',
      'Nomi': 'Title',
      'Fayllar': 'Files',
      'Guruh': 'Group',
      'Film nomi': 'Movie title',
      'Video fayl': 'Video file',
      'Subtitr fayli (ixtiyoriy)': 'Subtitle file (optional)',
      "Subtitr yuklanmasa, o'quvchi yoqqanda avtomatik tayyorlanadi": 'If no subtitle is uploaded, it is generated automatically when a student turns it on',
      'Yuklash': 'Upload',
      'Yuklanmoqda': 'Uploading',
      'Ko\'rish': 'Watch',
      'Ko\'rilgan:': 'Watched:',
      'daqiqa': 'min',
      "Hali ko'rilmagan": 'Not watched yet',
      "Uzluksiz ko'rilgan:": 'Continuously watched:',
      'Jami:': 'Total:',
      'Ijro / pauza': 'Play / pause',
      'Subtitr': 'Subtitles',
      "To'liq ekran": 'Fullscreen',
      'Vaqt': 'Time',
      "Manbani o'chirish": 'Delete resource',
      "Filmni o'chirish": 'Delete movie',
      "Ha, o'chirish": 'Yes, delete',
      'Tayyorlanmoqda': 'Preparing',
      "Subtitr yo'q": 'No subtitles',
      'Subtitr tayyorlanmoqda…': 'Preparing subtitles…',
      'Subtitr mavjud emas': 'Subtitles are not available',
      'Avtomatik subtitr hozircha ishlamayapti. Ustoz subtitle fayli yuklashi mumkin.':
        'Automatic subtitles are unavailable right now. The teacher can upload a subtitle file.',
      "Subtitr hali tayyor emas. Keyinroq qayta urinib ko'ring.": 'Subtitles are not ready yet. Please try again later.',
      "Hozircha manba yo'q": 'No resources yet',
      "Hozircha film yo'q": 'No movies yet'
    });
  }

  window.LibraryApp = {
    resourcesScreen: libResourcesScreen,
    moviesScreen: libMoviesScreen,
    studentResourcesHTML: studentResourcesHTML,
    studentMoviesHTML: studentMoviesHTML,
    parseCues: libParseCues,
    afterRender: libAfterRender,
    openResourceModal: openResourceModal,
    openMovieModal: openMovieModal,
    movies: moviesAll,
    resources: resourcesAll,
    tutoringGroups: tutoringGroups,
    deleteCloudFile: deleteCloudFile,
    fetchCues: fetchCues,
    pull: libPull,
    _useStore: function (mode) {
      if (mode) { LIB_STORE = mode; libStoreProbe = null; }
      return LIB_STORE;
    },
    watchStep: libWatchStep,
    notifyWatch: notifyWatch
  };
})();
