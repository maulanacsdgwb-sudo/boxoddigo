"use strict";

/* =====================================================
   ODDIGO MYSTERY BOX
   STORAGE.JS — TAHAP 1: CORE STORAGE
===================================================== */

const OddigoStorage = (() => {
    /* =================================================
       STORAGE KEYS
    ================================================= */

    const STORAGE_KEYS = Object.freeze({
        DATABASE: "oddigo_mystery_database",
        SESSION: "oddigo_admin_session",
        REMEMBERED_USERNAME: "oddigo_remembered_username",
        LAST_BACKUP: "oddigo_last_backup"
    });


    /* =================================================
       DATABASE VERSION
    ================================================= */

    const DATABASE_VERSION = 1;


    /* =================================================
       DEFAULT ADMIN
    ================================================= */

    const DEFAULT_ADMIN = Object.freeze({
        username: "admin",
        password: "oddigo",
        displayName: "ODDIGO Administrator",
        role: "superadmin"
    });


    /* =================================================
       DEFAULT REWARDS
    ================================================= */

    const DEFAULT_REWARDS = Object.freeze([
        {
            id: "reward-saldo-10000",
            name: "SALDO 10.000",
            icon: "💰",
            category: "saldo",
            enabled: true,
            order: 1,
            createdAt: null,
            updatedAt: null
        },
        {
            id: "reward-saldo-25000",
            name: "SALDO 25.000",
            icon: "💰",
            category: "saldo",
            enabled: true,
            order: 2,
            createdAt: null,
            updatedAt: null
        },
        {
            id: "reward-saldo-50000",
            name: "SALDO 50.000",
            icon: "💰",
            category: "saldo",
            enabled: true,
            order: 3,
            createdAt: null,
            updatedAt: null
        },
        {
            id: "reward-saldo-100000",
            name: "SALDO 100.000",
            icon: "💵",
            category: "saldo",
            enabled: true,
            order: 4,
            createdAt: null,
            updatedAt: null
        },
        {
            id: "reward-hp-android",
            name: "HP ANDROID",
            icon: "📱",
            category: "gadget",
            enabled: true,
            order: 5,
            createdAt: null,
            updatedAt: null
        },
        {
            id: "reward-iphone-15",
            name: "IPHONE 15",
            icon: "📱",
            category: "gadget",
            enabled: true,
            order: 6,
            createdAt: null,
            updatedAt: null
        }
    ]);


    /* =================================================
       DEFAULT SETTINGS
    ================================================= */

    const DEFAULT_SETTINGS = Object.freeze({
        systemName: "ODDIGO Mystery Box",
        systemSubtitle: "Premium Reward System",

        totalBoxes: 6,
        defaultAttempts: 1,
        defaultExpiredDays: 7,

        codePrefix: "ODDIGO",
        codeLength: 8,

        enableSound: true,
        enableConfetti: true,
        enableParticles: true,

        customerPageEnabled: true,
        maintenanceMode: false,

        allowExpiredCode: false,
        onePrizePerCode: true,

        updatedAt: null
    });


    /* =================================================
       DATE HELPERS
    ================================================= */

    function getCurrentISOTime() {
        return new Date().toISOString();
    }


    function addDaysToDate(days, startDate = new Date()) {
        const result = new Date(startDate);
        result.setDate(result.getDate() + Number(days || 0));

        return result.toISOString();
    }


    function isValidDate(dateValue) {
        if (!dateValue) {
            return false;
        }

        const date = new Date(dateValue);

        return !Number.isNaN(date.getTime());
    }


    function isDateExpired(dateValue) {
        if (!isValidDate(dateValue)) {
            return false;
        }

        return new Date(dateValue).getTime() < Date.now();
    }


    function formatDate(dateValue, options = {}) {
        if (!isValidDate(dateValue)) {
            return "-";
        }

        const defaultOptions = {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        };

        return new Intl.DateTimeFormat(
            "id-ID",
            {
                ...defaultOptions,
                ...options
            }
        ).format(new Date(dateValue));
    }


    /* =================================================
       STRING HELPERS
    ================================================= */

    function normalizeText(value) {
        return String(value ?? "").trim();
    }


    function normalizeUsername(value) {
        return normalizeText(value).toLowerCase();
    }


    function slugify(value) {
        return normalizeText(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }


    function sanitizeCode(value) {
        return normalizeText(value)
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, "");
    }


    function generateRandomString(length = 8) {
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let output = "";

        for (let index = 0; index < length; index += 1) {
            const randomIndex = Math.floor(
                Math.random() * characters.length
            );

            output += characters[randomIndex];
        }

        return output;
    }


    /* =================================================
       ID AND CODE GENERATOR
    ================================================= */

    function generateId(prefix = "item") {
        const safePrefix = slugify(prefix) || "item";

        const timestamp = Date.now().toString(36);
        const randomPart = generateRandomString(6).toLowerCase();

        return `${safePrefix}-${timestamp}-${randomPart}`;
    }


    function generateMysteryCode(options = {}) {
        const database = getDatabase();
        const settings = database.settings || DEFAULT_SETTINGS;

        const prefix = sanitizeCode(
            options.prefix || settings.codePrefix || "ODDIGO"
        );

        const codeLength = Math.max(
            4,
            Number(
                options.length ||
                settings.codeLength ||
                8
            )
        );

        let generatedCode = "";
        let attempts = 0;

        do {
            const randomPart = generateRandomString(codeLength);

            generatedCode = prefix
                ? `${prefix}-${randomPart}`
                : randomPart;

            attempts += 1;

            if (attempts > 100) {
                throw new Error(
                    "Gagal membuat mystery code yang unik."
                );
            }
        } while (
            database.codes.some(
                (item) => item.code === generatedCode
            )
        );

        return generatedCode;
    }


    /* =================================================
       OBJECT HELPERS
    ================================================= */

    function deepClone(value) {
        if (value === undefined) {
            return undefined;
        }

        return JSON.parse(JSON.stringify(value));
    }


    function isPlainObject(value) {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    function mergeObjects(baseObject, newObject) {
        const result = deepClone(baseObject);

        if (!isPlainObject(newObject)) {
            return result;
        }

        Object.keys(newObject).forEach((key) => {
            const currentValue = result[key];
            const newValue = newObject[key];

            if (
                isPlainObject(currentValue) &&
                isPlainObject(newValue)
            ) {
                result[key] = mergeObjects(
                    currentValue,
                    newValue
                );
            } else {
                result[key] = deepClone(newValue);
            }
        });

        return result;
    }


    /* =================================================
       SAFE JSON
    ================================================= */

    function safeJSONParse(value, fallback = null) {
        if (typeof value !== "string" || value.length === 0) {
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(
                "ODDIGO Storage: gagal membaca JSON.",
                error
            );

            return fallback;
        }
    }


    function safeJSONStringify(value, fallback = "{}") {
        try {
            return JSON.stringify(value);
        } catch (error) {
            console.error(
                "ODDIGO Storage: gagal mengubah data menjadi JSON.",
                error
            );

            return fallback;
        }
    }


    /* =================================================
       LOCAL STORAGE SUPPORT
    ================================================= */

    function isLocalStorageAvailable() {
        try {
            const testKey = "__oddigo_storage_test__";

            localStorage.setItem(testKey, "1");
            localStorage.removeItem(testKey);

            return true;
        } catch (error) {
            console.error(
                "LocalStorage tidak tersedia.",
                error
            );

            return false;
        }
    }


    function readStorage(key, fallback = null) {
        if (!isLocalStorageAvailable()) {
            return fallback;
        }

        try {
            const storedValue = localStorage.getItem(key);

            if (storedValue === null) {
                return fallback;
            }

            return safeJSONParse(storedValue, fallback);
        } catch (error) {
            console.error(
                `Gagal membaca storage: ${key}`,
                error
            );

            return fallback;
        }
    }


    function writeStorage(key, value) {
        if (!isLocalStorageAvailable()) {
            return false;
        }

        try {
            const serializedValue = safeJSONStringify(
                value,
                null
            );

            if (serializedValue === null) {
                return false;
            }

            localStorage.setItem(
                key,
                serializedValue
            );

            return true;
        } catch (error) {
            console.error(
                `Gagal menyimpan storage: ${key}`,
                error
            );

            return false;
        }
    }


    function removeStorage(key) {
        if (!isLocalStorageAvailable()) {
            return false;
        }

        try {
            localStorage.removeItem(key);

            return true;
        } catch (error) {
            console.error(
                `Gagal menghapus storage: ${key}`,
                error
            );

            return false;
        }
    }


    /* =================================================
       DEFAULT DATABASE
    ================================================= */

    function createDefaultDatabase() {
        const timestamp = getCurrentISOTime();

        const defaultRewards = DEFAULT_REWARDS.map(
            (reward) => ({
                ...deepClone(reward),
                createdAt: timestamp,
                updatedAt: timestamp
            })
        );

        return {
            version: DATABASE_VERSION,

            metadata: {
                appName: "ODDIGO Mystery Box",
                createdAt: timestamp,
                updatedAt: timestamp,
                lastOpenedAt: timestamp
            },

            admin: {
                username: DEFAULT_ADMIN.username,
                password: DEFAULT_ADMIN.password,
                displayName: DEFAULT_ADMIN.displayName,
                role: DEFAULT_ADMIN.role,
                updatedAt: timestamp
            },

            settings: {
                ...deepClone(DEFAULT_SETTINGS),
                updatedAt: timestamp
            },

            rewards: defaultRewards,

            codes: [],

            activityLogs: [
                {
                    id: generateId("log"),
                    type: "system",
                    action: "database_initialized",
                    description:
                        "Database ODDIGO Mystery Box berhasil dibuat.",
                    createdAt: timestamp
                }
            ]
        };
    }


    /* =================================================
       DATABASE VALIDATION
    ================================================= */

    function normalizeDatabase(database) {
        const defaultDatabase = createDefaultDatabase();

        if (!isPlainObject(database)) {
            return defaultDatabase;
        }

        const mergedDatabase = mergeObjects(
            defaultDatabase,
            database
        );

        mergedDatabase.version =
            Number(database.version) || DATABASE_VERSION;

        mergedDatabase.rewards = Array.isArray(
            database.rewards
        )
            ? database.rewards
            : defaultDatabase.rewards;

        mergedDatabase.codes = Array.isArray(
            database.codes
        )
            ? database.codes
            : [];

        mergedDatabase.activityLogs = Array.isArray(
            database.activityLogs
        )
            ? database.activityLogs
            : [];

        mergedDatabase.metadata.updatedAt =
            getCurrentISOTime();

        mergedDatabase.metadata.lastOpenedAt =
            getCurrentISOTime();

        return mergedDatabase;
    }


    /* =================================================
       DATABASE CORE
    ================================================= */

    function databaseExists() {
        if (!isLocalStorageAvailable()) {
            return false;
        }

        return (
            localStorage.getItem(
                STORAGE_KEYS.DATABASE
            ) !== null
        );
    }


    function initializeDatabase() {
        if (!isLocalStorageAvailable()) {
            return {
                success: false,
                message:
                    "Browser tidak mendukung localStorage."
            };
        }

        if (!databaseExists()) {
            const defaultDatabase =
                createDefaultDatabase();

            const saved = writeStorage(
                STORAGE_KEYS.DATABASE,
                defaultDatabase
            );

            return {
                success: saved,
                created: saved,
                database: deepClone(defaultDatabase),
                message: saved
                    ? "Database berhasil dibuat."
                    : "Database gagal dibuat."
            };
        }

        const existingDatabase = readStorage(
            STORAGE_KEYS.DATABASE,
            null
        );

        const normalizedDatabase =
            normalizeDatabase(existingDatabase);

        const saved = writeStorage(
            STORAGE_KEYS.DATABASE,
            normalizedDatabase
        );

        return {
            success: saved,
            created: false,
            database: deepClone(normalizedDatabase),
            message: saved
                ? "Database berhasil dimuat."
                : "Database gagal dimuat."
        };
    }


    function getDatabase() {
        if (!databaseExists()) {
            initializeDatabase();
        }

        const storedDatabase = readStorage(
            STORAGE_KEYS.DATABASE,
            null
        );

        return normalizeDatabase(storedDatabase);
    }


    function saveDatabase(database) {
        if (!isPlainObject(database)) {
            return {
                success: false,
                message:
                    "Format database tidak valid."
            };
        }

        const normalizedDatabase =
            normalizeDatabase(database);

        normalizedDatabase.metadata.updatedAt =
            getCurrentISOTime();

        const saved = writeStorage(
            STORAGE_KEYS.DATABASE,
            normalizedDatabase
        );

        return {
            success: saved,
            database: saved
                ? deepClone(normalizedDatabase)
                : null,
            message: saved
                ? "Database berhasil disimpan."
                : "Database gagal disimpan."
        };
    }


    function updateDatabase(callback) {
        if (typeof callback !== "function") {
            return {
                success: false,
                message:
                    "Callback update database tidak valid."
            };
        }

        const currentDatabase = getDatabase();
        const workingDatabase = deepClone(
            currentDatabase
        );

        try {
            const callbackResult = callback(
                workingDatabase
            );

            const databaseToSave =
                callbackResult &&
                isPlainObject(callbackResult)
                    ? callbackResult
                    : workingDatabase;

            return saveDatabase(databaseToSave);
        } catch (error) {
            console.error(
                "Gagal memperbarui database.",
                error
            );

            return {
                success: false,
                message:
                    error.message ||
                    "Terjadi kesalahan saat memperbarui database."
            };
        }
    }


    /* =================================================
       ACTIVITY LOG
    ================================================= */

    function addActivityLog(
        type,
        action,
        description,
        metadata = {}
    ) {
        return updateDatabase((database) => {
            database.activityLogs.unshift({
                id: generateId("log"),
                type:
                    normalizeText(type) ||
                    "system",
                action:
                    normalizeText(action) ||
                    "unknown",
                description:
                    normalizeText(description) ||
                    "-",
                metadata:
                    isPlainObject(metadata)
                        ? deepClone(metadata)
                        : {},
                createdAt: getCurrentISOTime()
            });

            if (database.activityLogs.length > 500) {
                database.activityLogs =
                    database.activityLogs.slice(0, 500);
            }

            return database;
        });
    }


    function getActivityLogs(limit = 50) {
        const database = getDatabase();

        const safeLimit = Math.max(
            1,
            Number(limit) || 50
        );

        return deepClone(
            database.activityLogs.slice(0, safeLimit)
        );
    }


    /* =================================================
       BACKUP CORE
    ================================================= */

    function createBackup() {
        const database = getDatabase();

        const backup = {
            backupVersion: 1,
            appName: "ODDIGO Mystery Box",
            createdAt: getCurrentISOTime(),
            database: deepClone(database)
        };

        writeStorage(
            STORAGE_KEYS.LAST_BACKUP,
            backup
        );

        addActivityLog(
            "backup",
            "backup_created",
            "Backup database berhasil dibuat."
        );

        return deepClone(backup);
    }


    function exportBackupJSON(
        spacing = 2
    ) {
        const backup = createBackup();

        return JSON.stringify(
            backup,
            null,
            spacing
        );
    }


    function downloadBackup(
        filename = ""
    ) {
        try {
            const backupJSON =
                exportBackupJSON(2);

            const currentDate = new Date()
                .toISOString()
                .slice(0, 10);

            const finalFilename =
                normalizeText(filename) ||
                `oddigo-backup-${currentDate}.json`;

            const blob = new Blob(
                [backupJSON],
                {
                    type: "application/json"
                }
            );

            const temporaryURL =
                URL.createObjectURL(blob);

            const downloadLink =
                document.createElement("a");

            downloadLink.href = temporaryURL;
            downloadLink.download = finalFilename;
            downloadLink.style.display = "none";

            document.body.appendChild(
                downloadLink
            );

            downloadLink.click();
            downloadLink.remove();

            URL.revokeObjectURL(
                temporaryURL
            );

            return {
                success: true,
                message:
                    "Backup berhasil diunduh."
            };
        } catch (error) {
            console.error(
                "Gagal mengunduh backup.",
                error
            );

            return {
                success: false,
                message:
                    "Backup gagal diunduh."
            };
        }
    }


    function validateBackup(backupData) {
        if (!isPlainObject(backupData)) {
            return {
                valid: false,
                message:
                    "Format backup tidak valid."
            };
        }

        if (!isPlainObject(backupData.database)) {
            return {
                valid: false,
                message:
                    "Backup tidak memiliki database."
            };
        }

        if (
            !Array.isArray(
                backupData.database.rewards
            ) ||
            !Array.isArray(
                backupData.database.codes
            )
        ) {
            return {
                valid: false,
                message:
                    "Struktur database backup tidak lengkap."
            };
        }

        return {
            valid: true,
            message:
                "Backup valid."
        };
    }


    function restoreBackup(backupInput) {
        let backupData = backupInput;

        if (typeof backupInput === "string") {
            backupData = safeJSONParse(
                backupInput,
                null
            );
        }

        const validation =
            validateBackup(backupData);

        if (!validation.valid) {
            return {
                success: false,
                message: validation.message
            };
        }

        const normalizedDatabase =
            normalizeDatabase(
                backupData.database
            );

        normalizedDatabase.metadata.updatedAt =
            getCurrentISOTime();

        const saveResult =
            saveDatabase(normalizedDatabase);

        if (saveResult.success) {
            addActivityLog(
                "backup",
                "backup_restored",
                "Database berhasil dipulihkan dari backup."
            );
        }

        return {
            success: saveResult.success,
            message: saveResult.success
                ? "Backup berhasil dipulihkan."
                : "Backup gagal dipulihkan."
        };
    }


    /* =================================================
       DATABASE RESET
    ================================================= */

    function resetDatabase(options = {}) {
        const preserveAdmin =
            options.preserveAdmin === true;

        const preserveSettings =
            options.preserveSettings === true;

        const currentDatabase =
            getDatabase();

        const newDatabase =
            createDefaultDatabase();

        if (preserveAdmin) {
            newDatabase.admin =
                deepClone(currentDatabase.admin);
        }

        if (preserveSettings) {
            newDatabase.settings =
                deepClone(currentDatabase.settings);
        }

        const saveResult =
            saveDatabase(newDatabase);

        return {
            success: saveResult.success,
            message: saveResult.success
                ? "Database berhasil direset."
                : "Database gagal direset.",
            database: saveResult.database
        };
    }


    /* =================================================
       BASIC DATABASE INFORMATION
    ================================================= */

    function getDatabaseInfo() {
        const database = getDatabase();

        return {
            version: database.version,
            appName:
                database.metadata.appName,
            createdAt:
                database.metadata.createdAt,
            updatedAt:
                database.metadata.updatedAt,
            totalRewards:
                database.rewards.length,
            totalCodes:
                database.codes.length,
            totalLogs:
                database.activityLogs.length
        };
    }

/* =================================================
   ADMIN SESSION MANAGER
================================================= */

const SESSION_STATUS = Object.freeze({
    ACTIVE: "active",
    EXPIRED: "expired",
    INVALID: "invalid",
    LOGGED_OUT: "logged_out"
});


const DEFAULT_SESSION_DURATION = 8 * 60 * 60 * 1000;


/**
 * Membuat hash sederhana untuk password.
 *
 * Catatan:
 * Ini hanya digunakan untuk aplikasi localStorage.
 * Bukan pengganti keamanan server-side.
 *
 * @param {string} value
 * @returns {string}
 */
function createSimpleHash(value) {
    const input = String(value ?? "");

    let hash = 2166136261;

    for (
        let index = 0;
        index < input.length;
        index += 1
    ) {
        hash ^= input.charCodeAt(index);

        hash +=
            (hash << 1) +
            (hash << 4) +
            (hash << 7) +
            (hash << 8) +
            (hash << 24);
    }

    return (
        "oddigo_" +
        (hash >>> 0).toString(16)
    );
}


/**
 * Membuat token session acak.
 *
 * @returns {string}
 */
function generateSessionToken() {
    return [
        generateRandomString(16),
        Date.now().toString(36),
        generateRandomString(16)
    ].join(".");
}


/**
 * Mengambil konfigurasi admin.
 *
 * Password asli tidak disertakan secara default.
 *
 * @param {Object} options
 * @returns {Object|null}
 */
function getAdminAccount(options = {}) {
    const database = getDatabase();

    if (!isPlainObject(database.admin)) {
        return null;
    }

    const admin = deepClone(
        database.admin
    );

    if (options.includePassword !== true) {
        delete admin.password;
        delete admin.passwordHash;
    }

    return admin;
}


/**
 * Menyamakan struktur akun admin.
 *
 * @param {Object} adminData
 * @param {Object|null} existingAdmin
 * @returns {Object}
 */
function normalizeAdminData(
    adminData = {},
    existingAdmin = null
) {
    const currentAdmin =
        isPlainObject(existingAdmin)
            ? existingAdmin
            : {};

    const currentTime =
        getCurrentISOTime();

    const username =
        normalizeText(
            adminData.username ??
            currentAdmin.username ??
            DEFAULT_ADMIN.username
        );

    const displayName =
        normalizeText(
            adminData.displayName ??
            currentAdmin.displayName ??
            DEFAULT_ADMIN.displayName
        );

    const role =
        slugify(
            adminData.role ??
            currentAdmin.role ??
            DEFAULT_ADMIN.role
        ) || "admin";

    const rawPassword =
        normalizeText(
            adminData.password
        );

    const existingPassword =
        normalizeText(
            currentAdmin.password
        );

    const existingHash =
        normalizeText(
            currentAdmin.passwordHash
        );

    let password =
        existingPassword ||
        DEFAULT_ADMIN.password;

    let passwordHash =
        existingHash ||
        createSimpleHash(password);

    if (rawPassword) {
        password = rawPassword;
        passwordHash =
            createSimpleHash(
                rawPassword
            );
    }

    return {
        username,
        usernameNormalized:
            normalizeUsername(username),

        password,
        passwordHash,

        displayName,
        role,

        enabled:
            typeof adminData.enabled ===
            "boolean"
                ? adminData.enabled
                : currentAdmin.enabled !==
                    false,

        failedLoginAttempts:
            Number(
                adminData.failedLoginAttempts ??
                currentAdmin.failedLoginAttempts ??
                0
            ) || 0,

        lastLoginAt:
            adminData.lastLoginAt ??
            currentAdmin.lastLoginAt ??
            null,

        lastLogoutAt:
            adminData.lastLogoutAt ??
            currentAdmin.lastLogoutAt ??
            null,

        createdAt:
            currentAdmin.createdAt ||
            currentTime,

        updatedAt:
            currentTime
    };
}


/**
 * Memvalidasi perubahan data admin.
 *
 * @param {Object} adminData
 * @param {Object} options
 * @returns {Object}
 */
function validateAdminData(
    adminData,
    options = {}
) {
    const errors = {};

    if (!isPlainObject(adminData)) {
        return {
            valid: false,
            errors: {
                admin:
                    "Data admin tidak valid."
            },
            message:
                "Data admin tidak valid."
        };
    }

    const username =
        normalizeText(
            adminData.username
        );

    const displayName =
        normalizeText(
            adminData.displayName
        );

    const password =
        normalizeText(
            adminData.password
        );

    if (!username) {
        errors.username =
            "Username admin wajib diisi.";
    } else if (username.length < 3) {
        errors.username =
            "Username minimal 3 karakter.";
    } else if (username.length > 40) {
        errors.username =
            "Username maksimal 40 karakter.";
    } else if (
        !/^[a-zA-Z0-9._-]+$/.test(
            username
        )
    ) {
        errors.username =
            "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda minus.";
    }

    if (!displayName) {
        errors.displayName =
            "Nama admin wajib diisi.";
    } else if (
        displayName.length > 80
    ) {
        errors.displayName =
            "Nama admin maksimal 80 karakter.";
    }

    if (
        options.requirePassword === true &&
        !password
    ) {
        errors.password =
            "Password wajib diisi.";
    }

    if (
        password &&
        password.length < 4
    ) {
        errors.password =
            "Password minimal 4 karakter.";
    }

    if (
        password &&
        password.length > 100
    ) {
        errors.password =
            "Password maksimal 100 karakter.";
    }

    const errorMessages =
        Object.values(errors);

    return {
        valid:
            errorMessages.length === 0,
        errors,
        message:
            errorMessages[0] ||
            "Data admin valid."
    };
}


/**
 * Memperbarui akun admin.
 *
 * @param {Object} adminData
 * @returns {Object}
 */
function updateAdminAccount(
    adminData
) {
    const existingAdmin =
        getAdminAccount({
            includePassword: true
        });

    const mergedAdmin = {
        ...existingAdmin,
        ...adminData
    };

    const validation =
        validateAdminData(
            mergedAdmin,
            {
                requirePassword: false
            }
        );

    if (!validation.valid) {
        return {
            success: false,
            message:
                validation.message,
            errors:
                validation.errors,
            admin: null
        };
    }

    const updatedAdmin =
        normalizeAdminData(
            adminData,
            existingAdmin
        );

    const saveResult =
        updateDatabase(
            (database) => {
                database.admin =
                    updatedAdmin;

                database.activityLogs.unshift({
                    id:
                        generateId("log"),

                    type:
                        "admin",

                    action:
                        "admin_updated",

                    description:
                        "Data akun administrator berhasil diperbarui.",

                    metadata: {
                        username:
                            updatedAdmin.username,
                        role:
                            updatedAdmin.role
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return database;
            }
        );

    if (
        saveResult.success &&
        adminData.password
    ) {
        logoutAdmin({
            reason:
                "password_changed",
            logActivity: false
        });
    }

    return {
        success:
            saveResult.success,

        message:
            saveResult.success
                ? "Akun admin berhasil diperbarui."
                : saveResult.message,

        admin:
            saveResult.success
                ? getAdminAccount()
                : null
    };
}


/**
 * Mengganti password administrator.
 *
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {string} confirmation
 * @returns {Object}
 */
function changeAdminPassword(
    currentPassword,
    newPassword,
    confirmation
) {
    const admin =
        getAdminAccount({
            includePassword: true
        });

    if (!admin) {
        return {
            success: false,
            message:
                "Akun admin tidak ditemukan."
        };
    }

    const currentPasswordHash =
        createSimpleHash(
            normalizeText(
                currentPassword
            )
        );

    const storedPasswordHash =
        admin.passwordHash ||
        createSimpleHash(
            admin.password
        );

    if (
        currentPasswordHash !==
        storedPasswordHash
    ) {
        return {
            success: false,
            message:
                "Password lama tidak sesuai."
        };
    }

    const normalizedNewPassword =
        normalizeText(
            newPassword
        );

    if (
        normalizedNewPassword.length < 4
    ) {
        return {
            success: false,
            message:
                "Password baru minimal 4 karakter."
        };
    }

    if (
        normalizedNewPassword !==
        normalizeText(confirmation)
    ) {
        return {
            success: false,
            message:
                "Konfirmasi password tidak sesuai."
        };
    }

    if (
        createSimpleHash(
            normalizedNewPassword
        ) === storedPasswordHash
    ) {
        return {
            success: false,
            message:
                "Password baru tidak boleh sama dengan password lama."
        };
    }

    return updateAdminAccount({
        password:
            normalizedNewPassword
    });
}


/**
 * Menyimpan username yang diingat browser.
 *
 * @param {string} username
 * @returns {boolean}
 */
function rememberAdminUsername(
    username
) {
    const normalizedUsername =
        normalizeText(username);

    if (!normalizedUsername) {
        return removeStorage(
            STORAGE_KEYS.REMEMBERED_USERNAME
        );
    }

    return writeStorage(
        STORAGE_KEYS.REMEMBERED_USERNAME,
        {
            username:
                normalizedUsername,
            savedAt:
                getCurrentISOTime()
        }
    );
}


/**
 * Mengambil username yang pernah diingat.
 *
 * @returns {string}
 */
function getRememberedAdminUsername() {
    const rememberedData =
        readStorage(
            STORAGE_KEYS.REMEMBERED_USERNAME,
            null
        );

    if (
        !isPlainObject(
            rememberedData
        )
    ) {
        return "";
    }

    return normalizeText(
        rememberedData.username
    );
}


/**
 * Menghapus username yang disimpan.
 *
 * @returns {boolean}
 */
function clearRememberedAdminUsername() {
    return removeStorage(
        STORAGE_KEYS.REMEMBERED_USERNAME
    );
}


/**
 * Membuat session admin.
 *
 * @param {Object} admin
 * @param {Object} options
 * @returns {Object}
 */
function createAdminSession(
    admin,
    options = {}
) {
    const durationValue =
        Number(
            options.duration ??
            DEFAULT_SESSION_DURATION
        );

    const duration =
        Number.isFinite(
            durationValue
        )
            ? Math.max(
                60 * 1000,
                durationValue
            )
            : DEFAULT_SESSION_DURATION;

    const currentTime =
        Date.now();

    const session = {
        token:
            generateSessionToken(),

        username:
            admin.username,

        displayName:
            admin.displayName,

        role:
            admin.role,

        status:
            SESSION_STATUS.ACTIVE,

        createdAt:
            new Date(
                currentTime
            ).toISOString(),

        lastActivityAt:
            new Date(
                currentTime
            ).toISOString(),

        expiresAt:
            new Date(
                currentTime + duration
            ).toISOString(),

        duration,

        persistent:
            options.persistent === true
    };

    const saved =
        writeStorage(
            STORAGE_KEYS.SESSION,
            session
        );

    return {
        success: saved,
        session:
            saved
                ? deepClone(session)
                : null,
        message:
            saved
                ? "Session admin berhasil dibuat."
                : "Session admin gagal dibuat."
    };
}


/**
 * Mengambil session mentah.
 *
 * @returns {Object|null}
 */
function getRawAdminSession() {
    const session =
        readStorage(
            STORAGE_KEYS.SESSION,
            null
        );

    return isPlainObject(session)
        ? session
        : null;
}


/**
 * Menentukan status session.
 *
 * @param {Object} session
 * @returns {string}
 */
function resolveAdminSessionStatus(
    session
) {
    if (!isPlainObject(session)) {
        return SESSION_STATUS.INVALID;
    }

    if (
        session.status ===
        SESSION_STATUS.LOGGED_OUT
    ) {
        return SESSION_STATUS.LOGGED_OUT;
    }

    if (
        !session.token ||
        !session.username ||
        !isValidDate(
            session.expiresAt
        )
    ) {
        return SESSION_STATUS.INVALID;
    }

    if (
        new Date(
            session.expiresAt
        ).getTime() <= Date.now()
    ) {
        return SESSION_STATUS.EXPIRED;
    }

    return SESSION_STATUS.ACTIVE;
}


/**
 * Mengambil session admin yang valid.
 *
 * @param {Object} options
 * @returns {Object|null}
 */
function getAdminSession(
    options = {}
) {
    const session =
        getRawAdminSession();

    const status =
        resolveAdminSessionStatus(
            session
        );

    if (
        status !==
        SESSION_STATUS.ACTIVE
    ) {
        if (
            options.clearInvalid !== false &&
            session
        ) {
            removeStorage(
                STORAGE_KEYS.SESSION
            );
        }

        return null;
    }

    return deepClone({
        ...session,
        status
    });
}


/**
 * Memeriksa apakah admin sedang login.
 *
 * @returns {boolean}
 */
function isAdminLoggedIn() {
    return Boolean(
        getAdminSession()
    );
}


/**
 * Login administrator.
 *
 * @param {string} username
 * @param {string} password
 * @param {Object} options
 * @returns {Object}
 */
function loginAdmin(
    username,
    password,
    options = {}
) {
    const normalizedUsername =
        normalizeUsername(
            username
        );

    const normalizedPassword =
        normalizeText(
            password
        );

    if (!normalizedUsername) {
        return {
            success: false,
            reason:
                "invalid_username",
            message:
                "Username wajib diisi.",
            session: null
        };
    }

    if (!normalizedPassword) {
        return {
            success: false,
            reason:
                "invalid_password",
            message:
                "Password wajib diisi.",
            session: null
        };
    }

    const database =
        getDatabase();

    const admin =
        normalizeAdminData(
            database.admin,
            database.admin
        );

    if (admin.enabled === false) {
        return {
            success: false,
            reason:
                "account_disabled",
            message:
                "Akun administrator sedang dinonaktifkan.",
            session: null
        };
    }

    const usernameMatches =
        admin.usernameNormalized ===
        normalizedUsername;

    const passwordMatches =
        admin.passwordHash ===
        createSimpleHash(
            normalizedPassword
        );

    if (
        !usernameMatches ||
        !passwordMatches
    ) {
        updateDatabase(
            (workingDatabase) => {
                const currentAdmin =
                    normalizeAdminData(
                        workingDatabase.admin,
                        workingDatabase.admin
                    );

                currentAdmin.failedLoginAttempts =
                    Number(
                        currentAdmin
                            .failedLoginAttempts
                    ) + 1;

                currentAdmin.updatedAt =
                    getCurrentISOTime();

                workingDatabase.admin =
                    currentAdmin;

                workingDatabase.activityLogs.unshift({
                    id:
                        generateId("log"),

                    type:
                        "authentication",

                    action:
                        "login_failed",

                    description:
                        `Percobaan login gagal untuk username "${normalizeText(username)}".`,

                    metadata: {
                        username:
                            normalizeText(
                                username
                            )
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return workingDatabase;
            }
        );

        return {
            success: false,
            reason:
                "invalid_credentials",
            message:
                "Username atau password tidak sesuai.",
            session: null
        };
    }

    const sessionResult =
        createAdminSession(
            admin,
            {
                duration:
                    options.duration,

                persistent:
                    options.remember === true
            }
        );

    if (!sessionResult.success) {
        return {
            success: false,
            reason:
                "session_failed",
            message:
                sessionResult.message,
            session: null
        };
    }

    if (options.remember === true) {
        rememberAdminUsername(
            admin.username
        );
    } else if (
        options.clearRemembered === true
    ) {
        clearRememberedAdminUsername();
    }

    updateDatabase(
        (workingDatabase) => {
            const currentAdmin =
                normalizeAdminData(
                    workingDatabase.admin,
                    workingDatabase.admin
                );

            currentAdmin.failedLoginAttempts =
                0;

            currentAdmin.lastLoginAt =
                getCurrentISOTime();

            currentAdmin.updatedAt =
                getCurrentISOTime();

            workingDatabase.admin =
                currentAdmin;

            workingDatabase.activityLogs.unshift({
                id:
                    generateId("log"),

                type:
                    "authentication",

                action:
                    "login_success",

                description:
                    `Administrator "${admin.username}" berhasil login.`,

                metadata: {
                    username:
                        admin.username,
                    role:
                        admin.role
                },

                createdAt:
                    getCurrentISOTime()
            });

            return workingDatabase;
        }
    );

    return {
        success: true,
        reason:
            "authenticated",
        message:
            "Login berhasil.",
        session:
            sessionResult.session,
        admin:
            getAdminAccount()
    };
}


/**
 * Memperbarui aktivitas terakhir session.
 *
 * @param {Object} options
 * @returns {Object}
 */
function touchAdminSession(
    options = {}
) {
    const session =
        getAdminSession();

    if (!session) {
        return {
            success: false,
            message:
                "Session admin tidak aktif.",
            session: null
        };
    }

    const currentTime =
        Date.now();

    const extendSession =
        options.extend !== false;

    const duration =
        Number(
            session.duration
        ) ||
        DEFAULT_SESSION_DURATION;

    const updatedSession = {
        ...session,

        lastActivityAt:
            new Date(
                currentTime
            ).toISOString(),

        expiresAt:
            extendSession
                ? new Date(
                    currentTime +
                    duration
                ).toISOString()
                : session.expiresAt,

        status:
            SESSION_STATUS.ACTIVE
    };

    const saved =
        writeStorage(
            STORAGE_KEYS.SESSION,
            updatedSession
        );

    return {
        success: saved,
        message:
            saved
                ? "Session berhasil diperbarui."
                : "Session gagal diperbarui.",
        session:
            saved
                ? deepClone(
                    updatedSession
                )
                : null
    };
}


/**
 * Memperpanjang session admin.
 *
 * @param {number} duration
 * @returns {Object}
 */
function extendAdminSession(
    duration =
        DEFAULT_SESSION_DURATION
) {
    const session =
        getAdminSession();

    if (!session) {
        return {
            success: false,
            message:
                "Session admin tidak ditemukan.",
            session: null
        };
    }

    const durationValue =
        Number(duration);

    if (
        !Number.isFinite(
            durationValue
        ) ||
        durationValue <
            60 * 1000
    ) {
        return {
            success: false,
            message:
                "Durasi session tidak valid.",
            session: null
        };
    }

    const currentTime =
        Date.now();

    const updatedSession = {
        ...session,

        duration:
            durationValue,

        lastActivityAt:
            new Date(
                currentTime
            ).toISOString(),

        expiresAt:
            new Date(
                currentTime +
                durationValue
            ).toISOString()
    };

    const saved =
        writeStorage(
            STORAGE_KEYS.SESSION,
            updatedSession
        );

    return {
        success: saved,
        message:
            saved
                ? "Session berhasil diperpanjang."
                : "Session gagal diperpanjang.",
        session:
            saved
                ? deepClone(
                    updatedSession
                )
                : null
    };
}


/**
 * Mengambil sisa durasi session.
 *
 * @returns {number}
 */
function getAdminSessionRemainingTime() {
    const session =
        getAdminSession();

    if (!session) {
        return 0;
    }

    return Math.max(
        0,
        new Date(
            session.expiresAt
        ).getTime() - Date.now()
    );
}


/**
 * Logout administrator.
 *
 * @param {Object} options
 * @returns {Object}
 */
function logoutAdmin(
    options = {}
) {
    const session =
        getRawAdminSession();

    const removed =
        removeStorage(
            STORAGE_KEYS.SESSION
        );

    if (
        options.clearRemembered === true
    ) {
        clearRememberedAdminUsername();
    }

    if (
        options.logActivity !== false
    ) {
        updateDatabase(
            (database) => {
                const admin =
                    normalizeAdminData(
                        database.admin,
                        database.admin
                    );

                admin.lastLogoutAt =
                    getCurrentISOTime();

                admin.updatedAt =
                    getCurrentISOTime();

                database.admin =
                    admin;

                database.activityLogs.unshift({
                    id:
                        generateId("log"),

                    type:
                        "authentication",

                    action:
                        "logout",

                    description:
                        `Administrator "${session?.username || admin.username}" berhasil logout.`,

                    metadata: {
                        username:
                            session?.username ||
                            admin.username,

                        reason:
                            normalizeText(
                                options.reason
                            ) ||
                            "manual"
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return database;
            }
        );
    }

    return {
        success: removed,
        message:
            removed
                ? "Logout berhasil."
                : "Session sudah tidak aktif."
    };
}


/**
 * Memastikan halaman hanya dapat dibuka admin.
 *
 * @param {Object} options
 * @returns {Object}
 */
function requireAdminSession(
    options = {}
) {
    const session =
        getAdminSession();

    if (session) {
        if (
            options.touch !== false
        ) {
            touchAdminSession({
                extend:
                    options.extend !==
                    false
            });
        }

        return {
            authorized: true,
            session:
                getAdminSession(),
            redirect:
                false
        };
    }

    if (
        options.redirect !== false &&
        typeof window !==
            "undefined"
    ) {
        const loginPage =
            normalizeText(
                options.loginPage
            ) ||
            "index.html";

        window.location.href =
            loginPage;
    }

    return {
        authorized: false,
        session: null,
        redirect:
            options.redirect !==
            false
    };
}


/**
 * Mengembalikan akun admin ke akun bawaan.
 *
 * @param {Object} options
 * @returns {Object}
 */
function resetAdminAccount(
    options = {}
) {
    const currentTime =
        getCurrentISOTime();

    const defaultAdmin =
        normalizeAdminData(
            {
                username:
                    DEFAULT_ADMIN.username,

                password:
                    DEFAULT_ADMIN.password,

                displayName:
                    DEFAULT_ADMIN.displayName,

                role:
                    DEFAULT_ADMIN.role,

                enabled: true,

                failedLoginAttempts:
                    0,

                lastLoginAt:
                    null,

                lastLogoutAt:
                    null,

                createdAt:
                    currentTime
            }
        );

    const saveResult =
        updateDatabase(
            (database) => {
                database.admin =
                    defaultAdmin;

                database.activityLogs.unshift({
                    id:
                        generateId("log"),

                    type:
                        "admin",

                    action:
                        "admin_reset",

                    description:
                        "Akun administrator berhasil dikembalikan ke pengaturan bawaan.",

                    metadata: {
                        username:
                            defaultAdmin.username
                    },

                    createdAt:
                        currentTime
                });

                return database;
            }
        );

    if (saveResult.success) {
        logoutAdmin({
            reason:
                "admin_reset",
            logActivity: false,
            clearRemembered:
                options.clearRemembered ===
                true
        });
    }

    return {
        success:
            saveResult.success,

        message:
            saveResult.success
                ? "Akun admin berhasil direset."
                : saveResult.message,

        admin:
            saveResult.success
                ? getAdminAccount()
                : null
    };
}
    /* =================================================
       INITIALIZE AUTOMATICALLY
    ================================================= */

    const initializationResult =
        initializeDatabase();

    if (!initializationResult.success) {
        console.error(
            initializationResult.message
        );
    } else {
        console.info(
            "ODDIGO Storage siap.",
            getDatabaseInfo()
        );
    }


    /* =================================================
       PUBLIC API
    ================================================= */

    return Object.freeze({
        STORAGE_KEYS,
        DATABASE_VERSION,

        initializeDatabase,
        databaseExists,
        getDatabase,
        saveDatabase,
        updateDatabase,
        resetDatabase,
        getDatabaseInfo,

        readStorage,
        writeStorage,
        removeStorage,
        isLocalStorageAvailable,

        createBackup,
        exportBackupJSON,
        downloadBackup,
        validateBackup,
        restoreBackup,

        addActivityLog,
        getActivityLogs,

        generateId,
        generateMysteryCode,
        generateRandomString,

        getCurrentISOTime,
        addDaysToDate,
        isValidDate,
        isDateExpired,
        formatDate,

        normalizeText,
        normalizeUsername,
        sanitizeCode,
        slugify,

        deepClone,
        mergeObjects,
        safeJSONParse,
        safeJSONStringify
    });

         CODE_STATUS,

        getMysteryCodes,
        getMysteryCodeById,
        getMysteryCodeByCode,
        getMysteryCodesByUsername,
        getMysteryCodeStatistics,

        createMysteryCode,
        updateMysteryCode,
        deleteMysteryCode,
        deleteAllMysteryCodes,

        setMysteryCodeEnabled,
        toggleMysteryCode,

        verifyMysteryCode,
        consumeMysteryCodeAttempt,
        openMysteryCode,
        resetMysteryCodeOpening,
        extendMysteryCodeExpiration,

        validateMysteryCodeData,
        normalizeMysteryCodeData,
        resolveMysteryCodeStatus,
        refreshMysteryCodeStatuses,
        sortMysteryCodes,
})();


/* =====================================================
   GLOBAL ACCESS
===================================================== */

window.OddigoStorage = OddigoStorage;

/* =================================================
   REWARD MANAGER
================================================= */

/**
 * Mengubah data reward menjadi format yang konsisten.
 *
 * @param {Object} rewardData
 * @param {Object|null} existingReward
 * @returns {Object}
 */
function normalizeRewardData(
    rewardData = {},
    existingReward = null
) {
    const currentTime = getCurrentISOTime();

    const currentReward = isPlainObject(existingReward)
        ? existingReward
        : {};

    const name = normalizeText(
        rewardData.name ?? currentReward.name
    );

    const icon = normalizeText(
        rewardData.icon ?? currentReward.icon
    ) || "🎁";

    const category = slugify(
        rewardData.category ??
        currentReward.category ??
        "lainnya"
    ) || "lainnya";

    const description = normalizeText(
        rewardData.description ??
        currentReward.description ??
        ""
    );

    const enabled =
        typeof rewardData.enabled === "boolean"
            ? rewardData.enabled
            : currentReward.enabled !== false;

    const orderValue = Number(
        rewardData.order ??
        currentReward.order ??
        0
    );

    const order = Number.isFinite(orderValue)
        ? Math.max(0, Math.floor(orderValue))
        : 0;

    return {
        id:
            normalizeText(currentReward.id) ||
            generateId("reward"),

        name,
        icon,
        category,
        description,
        enabled,
        order,

        createdAt:
            currentReward.createdAt ||
            currentTime,

        updatedAt: currentTime
    };
}


/**
 * Memvalidasi data reward.
 *
 * @param {Object} rewardData
 * @param {Object} options
 * @returns {{valid: boolean, errors: Object, message: string}}
 */
function validateRewardData(
    rewardData,
    options = {}
) {
    const errors = {};

    if (!isPlainObject(rewardData)) {
        return {
            valid: false,
            errors: {
                reward: "Data reward tidak valid."
            },
            message: "Data reward tidak valid."
        };
    }

    const name = normalizeText(rewardData.name);
    const icon = normalizeText(rewardData.icon);
    const category = normalizeText(
        rewardData.category
    );

    if (!name) {
        errors.name =
            "Nama hadiah wajib diisi.";
    } else if (name.length < 2) {
        errors.name =
            "Nama hadiah minimal 2 karakter.";
    } else if (name.length > 80) {
        errors.name =
            "Nama hadiah maksimal 80 karakter.";
    }

    if (icon.length > 20) {
        errors.icon =
            "Icon hadiah terlalu panjang.";
    }

    if (category.length > 40) {
        errors.category =
            "Kategori maksimal 40 karakter.";
    }

    if (
        rewardData.description &&
        normalizeText(
            rewardData.description
        ).length > 300
    ) {
        errors.description =
            "Deskripsi maksimal 300 karakter.";
    }

    if (
        rewardData.order !== undefined &&
        (
            !Number.isFinite(
                Number(rewardData.order)
            ) ||
            Number(rewardData.order) < 0
        )
    ) {
        errors.order =
            "Urutan hadiah harus berupa angka positif.";
    }

    if (
        options.checkDuplicate !== false &&
        name
    ) {
        const database = getDatabase();

        const excludedId = normalizeText(
            options.excludeId
        );

        const duplicateReward =
            database.rewards.find(
                (reward) =>
                    normalizeText(
                        reward.name
                    ).toLowerCase() ===
                        name.toLowerCase() &&
                    reward.id !== excludedId
            );

        if (duplicateReward) {
            errors.name =
                "Nama hadiah sudah digunakan.";
        }
    }

    const errorMessages =
        Object.values(errors);

    return {
        valid: errorMessages.length === 0,
        errors,
        message:
            errorMessages[0] ||
            "Data hadiah valid."
    };
}


/**
 * Mengurutkan daftar reward.
 *
 * @param {Array} rewards
 * @returns {Array}
 */
function sortRewards(rewards) {
    if (!Array.isArray(rewards)) {
        return [];
    }

    return [...rewards].sort(
        (firstReward, secondReward) => {
            const firstOrder =
                Number(firstReward.order) || 0;

            const secondOrder =
                Number(secondReward.order) || 0;

            if (firstOrder !== secondOrder) {
                return firstOrder - secondOrder;
            }

            return normalizeText(
                firstReward.name
            ).localeCompare(
                normalizeText(
                    secondReward.name
                ),
                "id-ID"
            );
        }
    );
}


/**
 * Mengambil semua reward dengan filter.
 *
 * @param {Object} options
 * @returns {Array}
 */
function getRewards(options = {}) {
    const database = getDatabase();

    let rewards = Array.isArray(
        database.rewards
    )
        ? deepClone(database.rewards)
        : [];

    if (
        typeof options.enabled === "boolean"
    ) {
        rewards = rewards.filter(
            (reward) =>
                reward.enabled === options.enabled
        );
    }

    const category = slugify(
        options.category
    );

    if (category) {
        rewards = rewards.filter(
            (reward) =>
                slugify(reward.category) === category
        );
    }

    const searchKeyword =
        normalizeText(
            options.search
        ).toLowerCase();

    if (searchKeyword) {
        rewards = rewards.filter(
            (reward) => {
                const searchableText = [
                    reward.name,
                    reward.category,
                    reward.description
                ]
                    .map((value) =>
                        normalizeText(
                            value
                        ).toLowerCase()
                    )
                    .join(" ");

                return searchableText.includes(
                    searchKeyword
                );
            }
        );
    }

    const sortedRewards =
        options.sort === false
            ? rewards
            : sortRewards(rewards);

    const limit = Number(options.limit);

    if (
        Number.isFinite(limit) &&
        limit > 0
    ) {
        return sortedRewards.slice(
            0,
            Math.floor(limit)
        );
    }

    return sortedRewards;
}


/**
 * Mengambil reward aktif saja.
 *
 * @returns {Array}
 */
function getEnabledRewards() {
    return getRewards({
        enabled: true
    });
}


/**
 * Mencari reward berdasarkan ID.
 *
 * @param {string} rewardId
 * @returns {Object|null}
 */
function getRewardById(rewardId) {
    const normalizedId =
        normalizeText(rewardId);

    if (!normalizedId) {
        return null;
    }

    const database = getDatabase();

    const reward = database.rewards.find(
        (item) =>
            item.id === normalizedId
    );

    return reward
        ? deepClone(reward)
        : null;
}


/**
 * Mencari reward berdasarkan nama.
 *
 * @param {string} rewardName
 * @returns {Object|null}
 */
function getRewardByName(rewardName) {
    const normalizedName =
        normalizeText(
            rewardName
        ).toLowerCase();

    if (!normalizedName) {
        return null;
    }

    const database = getDatabase();

    const reward = database.rewards.find(
        (item) =>
            normalizeText(
                item.name
            ).toLowerCase() ===
            normalizedName
    );

    return reward
        ? deepClone(reward)
        : null;
}


/**
 * Mengambil seluruh kategori reward.
 *
 * @returns {Array}
 */
function getRewardCategories() {
    const rewards = getRewards({
        sort: false
    });

    const categories = rewards
        .map((reward) =>
            slugify(reward.category)
        )
        .filter(Boolean);

    return [...new Set(categories)].sort(
        (firstCategory, secondCategory) =>
            firstCategory.localeCompare(
                secondCategory,
                "id-ID"
            )
    );
}


/**
 * Membuat reward baru.
 *
 * @param {Object} rewardData
 * @returns {Object}
 */
function addReward(rewardData) {
    const validation =
        validateRewardData(
            rewardData,
            {
                checkDuplicate: true
            }
        );

    if (!validation.valid) {
        return {
            success: false,
            message: validation.message,
            errors: validation.errors,
            reward: null
        };
    }

    const database = getDatabase();

    const highestOrder =
        database.rewards.reduce(
            (highestValue, reward) =>
                Math.max(
                    highestValue,
                    Number(reward.order) || 0
                ),
            0
        );

    const rewardToCreate =
        normalizeRewardData({
            ...rewardData,
            order:
                rewardData.order ??
                highestOrder + 1
        });

    const saveResult = updateDatabase(
        (workingDatabase) => {
            workingDatabase.rewards.push(
                rewardToCreate
            );

            workingDatabase.rewards =
                sortRewards(
                    workingDatabase.rewards
                );

            workingDatabase.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action: "reward_created",
                description:
                    `Hadiah "${rewardToCreate.name}" berhasil ditambahkan.`,
                metadata: {
                    rewardId:
                        rewardToCreate.id,
                    rewardName:
                        rewardToCreate.name
                },
                createdAt:
                    getCurrentISOTime()
            });

            return workingDatabase;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? "Hadiah berhasil ditambahkan."
            : "Hadiah gagal ditambahkan.",
        reward: saveResult.success
            ? deepClone(rewardToCreate)
            : null
    };
}


/**
 * Memperbarui reward.
 *
 * @param {string} rewardId
 * @param {Object} rewardData
 * @returns {Object}
 */
function updateReward(
    rewardId,
    rewardData
) {
    const normalizedId =
        normalizeText(rewardId);

    if (!normalizedId) {
        return {
            success: false,
            message:
                "ID hadiah tidak valid.",
            errors: {
                id:
                    "ID hadiah tidak valid."
            },
            reward: null
        };
    }

    const existingReward =
        getRewardById(normalizedId);

    if (!existingReward) {
        return {
            success: false,
            message:
                "Hadiah tidak ditemukan.",
            errors: {
                id:
                    "Hadiah tidak ditemukan."
            },
            reward: null
        };
    }

    const mergedRewardData = {
        ...existingReward,
        ...rewardData
    };

    const validation =
        validateRewardData(
            mergedRewardData,
            {
                checkDuplicate: true,
                excludeId: normalizedId
            }
        );

    if (!validation.valid) {
        return {
            success: false,
            message: validation.message,
            errors: validation.errors,
            reward: null
        };
    }

    const updatedReward =
        normalizeRewardData(
            mergedRewardData,
            existingReward
        );

    const saveResult = updateDatabase(
        (database) => {
            const rewardIndex =
                database.rewards.findIndex(
                    (reward) =>
                        reward.id === normalizedId
                );

            if (rewardIndex === -1) {
                throw new Error(
                    "Hadiah tidak ditemukan."
                );
            }

            database.rewards[
                rewardIndex
            ] = updatedReward;

            database.rewards =
                sortRewards(
                    database.rewards
                );

            database.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action: "reward_updated",
                description:
                    `Hadiah "${updatedReward.name}" berhasil diperbarui.`,
                metadata: {
                    rewardId:
                        updatedReward.id,
                    rewardName:
                        updatedReward.name
                },
                createdAt:
                    getCurrentISOTime()
            });

            return database;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? "Hadiah berhasil diperbarui."
            : saveResult.message,
        reward: saveResult.success
            ? deepClone(updatedReward)
            : null
    };
}


/**
 * Menghapus reward.
 *
 * Reward yang sudah dipakai oleh kode tidak boleh
 * dihapus secara permanen secara default.
 *
 * @param {string} rewardId
 * @param {Object} options
 * @returns {Object}
 */
function deleteReward(
    rewardId,
    options = {}
) {
    const normalizedId =
        normalizeText(rewardId);

    const reward =
        getRewardById(normalizedId);

    if (!reward) {
        return {
            success: false,
            message:
                "Hadiah tidak ditemukan."
        };
    }

    const database = getDatabase();

    const rewardIsUsed =
        database.codes.some(
            (codeItem) =>
                codeItem.rewardId ===
                normalizedId
        );

    if (
        rewardIsUsed &&
        options.force !== true
    ) {
        return {
            success: false,
            message:
                "Hadiah sudah digunakan pada mystery code dan tidak dapat dihapus. Nonaktifkan hadiah atau gunakan opsi force."
        };
    }

    const saveResult = updateDatabase(
        (workingDatabase) => {
            workingDatabase.rewards =
                workingDatabase.rewards.filter(
                    (item) =>
                        item.id !== normalizedId
                );

            workingDatabase.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action: "reward_deleted",
                description:
                    `Hadiah "${reward.name}" berhasil dihapus.`,
                metadata: {
                    rewardId: reward.id,
                    rewardName: reward.name,
                    forced:
                        options.force === true
                },
                createdAt:
                    getCurrentISOTime()
            });

            return workingDatabase;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? "Hadiah berhasil dihapus."
            : saveResult.message
    };
}


/**
 * Mengaktifkan atau menonaktifkan reward.
 *
 * @param {string} rewardId
 * @param {boolean} enabled
 * @returns {Object}
 */
function setRewardEnabled(
    rewardId,
    enabled
) {
    const reward =
        getRewardById(rewardId);

    if (!reward) {
        return {
            success: false,
            message:
                "Hadiah tidak ditemukan.",
            reward: null
        };
    }

    const finalEnabled =
        typeof enabled === "boolean"
            ? enabled
            : !reward.enabled;

    return updateReward(
        reward.id,
        {
            enabled: finalEnabled
        }
    );
}


/**
 * Membalik status aktif/nonaktif reward.
 *
 * @param {string} rewardId
 * @returns {Object}
 */
function toggleReward(rewardId) {
    const reward =
        getRewardById(rewardId);

    if (!reward) {
        return {
            success: false,
            message:
                "Hadiah tidak ditemukan.",
            reward: null
        };
    }

    return setRewardEnabled(
        reward.id,
        !reward.enabled
    );
}


/**
 * Mengubah posisi reward.
 *
 * @param {string} rewardId
 * @param {number} newPosition
 * @returns {Object}
 */
function moveReward(
    rewardId,
    newPosition
) {
    const normalizedId =
        normalizeText(rewardId);

    const rewards = getRewards();

    const currentIndex =
        rewards.findIndex(
            (reward) =>
                reward.id === normalizedId
        );

    if (currentIndex === -1) {
        return {
            success: false,
            message:
                "Hadiah tidak ditemukan."
        };
    }

    const requestedPosition =
        Math.floor(
            Number(newPosition)
        );

    if (
        !Number.isFinite(
            requestedPosition
        )
    ) {
        return {
            success: false,
            message:
                "Posisi hadiah tidak valid."
        };
    }

    const targetIndex = Math.min(
        Math.max(
            requestedPosition - 1,
            0
        ),
        rewards.length - 1
    );

    const movedReward =
        rewards.splice(
            currentIndex,
            1
        )[0];

    rewards.splice(
        targetIndex,
        0,
        movedReward
    );

    rewards.forEach(
        (reward, index) => {
            reward.order = index + 1;
            reward.updatedAt =
                getCurrentISOTime();
        }
    );

    const saveResult = updateDatabase(
        (database) => {
            database.rewards =
                deepClone(rewards);

            database.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action: "reward_reordered",
                description:
                    `Urutan hadiah "${movedReward.name}" berhasil diubah.`,
                metadata: {
                    rewardId:
                        movedReward.id,
                    newPosition:
                        targetIndex + 1
                },
                createdAt:
                    getCurrentISOTime()
            });

            return database;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? "Urutan hadiah berhasil diubah."
            : saveResult.message,
        rewards: saveResult.success
            ? getRewards()
            : []
    };
}


/**
 * Mengubah seluruh urutan reward berdasarkan daftar ID.
 *
 * @param {Array<string>} rewardIds
 * @returns {Object}
 */
function reorderRewards(rewardIds) {
    if (!Array.isArray(rewardIds)) {
        return {
            success: false,
            message:
                "Daftar urutan hadiah tidak valid."
        };
    }

    const database = getDatabase();

    const uniqueIds = [
        ...new Set(
            rewardIds
                .map(normalizeText)
                .filter(Boolean)
        )
    ];

    if (
        uniqueIds.length !==
        database.rewards.length
    ) {
        return {
            success: false,
            message:
                "Jumlah ID hadiah tidak sesuai."
        };
    }

    const rewardMap = new Map(
        database.rewards.map(
            (reward) => [
                reward.id,
                reward
            ]
        )
    );

    const hasInvalidId =
        uniqueIds.some(
            (rewardId) =>
                !rewardMap.has(rewardId)
        );

    if (hasInvalidId) {
        return {
            success: false,
            message:
                "Terdapat ID hadiah yang tidak ditemukan."
        };
    }

    const currentTime =
        getCurrentISOTime();

    const reorderedRewards =
        uniqueIds.map(
            (rewardId, index) => ({
                ...deepClone(
                    rewardMap.get(
                        rewardId
                    )
                ),
                order: index + 1,
                updatedAt: currentTime
            })
        );

    const saveResult = updateDatabase(
        (workingDatabase) => {
            workingDatabase.rewards =
                reorderedRewards;

            workingDatabase.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action: "rewards_reordered",
                description:
                    "Urutan seluruh hadiah berhasil diperbarui.",
                metadata: {
                    totalRewards:
                        reorderedRewards.length
                },
                createdAt: currentTime
            });

            return workingDatabase;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? "Urutan hadiah berhasil disimpan."
            : saveResult.message,
        rewards: saveResult.success
            ? deepClone(
                reorderedRewards
            )
            : []
    };
}


/**
 * Menghapus seluruh reward.
 *
 * @param {Object} options
 * @returns {Object}
 */
function deleteAllRewards(
    options = {}
) {
    const database = getDatabase();

    if (
        database.codes.length > 0 &&
        options.force !== true
    ) {
        return {
            success: false,
            message:
                "Masih terdapat mystery code yang menggunakan hadiah. Gunakan opsi force untuk melanjutkan."
        };
    }

    const totalRewards =
        database.rewards.length;

    const saveResult = updateDatabase(
        (workingDatabase) => {
            workingDatabase.rewards = [];

            workingDatabase.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action:
                    "all_rewards_deleted",
                description:
                    `${totalRewards} hadiah berhasil dihapus.`,
                metadata: {
                    totalDeleted:
                        totalRewards,
                    forced:
                        options.force === true
                },
                createdAt:
                    getCurrentISOTime()
            });

            return workingDatabase;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? `${totalRewards} hadiah berhasil dihapus.`
            : saveResult.message,
        totalDeleted: saveResult.success
            ? totalRewards
            : 0
    };
}


/**
 * Mengembalikan reward bawaan.
 *
 * Reward lama dapat dipertahankan atau diganti.
 *
 * @param {Object} options
 * @returns {Object}
 */
function restoreDefaultRewards(
    options = {}
) {
    const replaceExisting =
        options.replaceExisting === true;

    const timestamp =
        getCurrentISOTime();

    const defaultRewards =
        DEFAULT_REWARDS.map(
            (reward) => ({
                ...deepClone(reward),
                createdAt: timestamp,
                updatedAt: timestamp
            })
        );

    const saveResult = updateDatabase(
        (database) => {
            if (replaceExisting) {
                database.rewards =
                    defaultRewards;
            } else {
                const existingNames =
                    new Set(
                        database.rewards.map(
                            (reward) =>
                                normalizeText(
                                    reward.name
                                ).toLowerCase()
                        )
                    );

                const rewardsToAdd =
                    defaultRewards.filter(
                        (reward) =>
                            !existingNames.has(
                                normalizeText(
                                    reward.name
                                ).toLowerCase()
                            )
                    );

                database.rewards.push(
                    ...rewardsToAdd
                );

                database.rewards =
                    sortRewards(
                        database.rewards
                    );
            }

            database.activityLogs.unshift({
                id: generateId("log"),
                type: "reward",
                action:
                    "default_rewards_restored",
                description:
                    "Hadiah bawaan berhasil dipulihkan.",
                metadata: {
                    replaceExisting
                },
                createdAt: timestamp
            });

            return database;
        }
    );

    return {
        success: saveResult.success,
        message: saveResult.success
            ? "Hadiah bawaan berhasil dipulihkan."
            : saveResult.message,
        rewards: saveResult.success
            ? getRewards()
            : []
    };
}


/**
 * Mengambil statistik reward.
 *
 * @returns {Object}
 */
function getRewardStatistics() {
    const rewards = getRewards({
        sort: false
    });

    const categories = {};

    rewards.forEach((reward) => {
        const category =
            slugify(reward.category) ||
            "lainnya";

        if (!categories[category]) {
            categories[category] = {
                total: 0,
                enabled: 0,
                disabled: 0
            };
        }

        categories[category].total += 1;

        if (reward.enabled) {
            categories[
                category
            ].enabled += 1;
        } else {
            categories[
                category
            ].disabled += 1;
        }
    });

    return {
        total: rewards.length,

        enabled: rewards.filter(
            (reward) =>
                reward.enabled === true
        ).length,

        disabled: rewards.filter(
            (reward) =>
                reward.enabled !== true
        ).length,

        categories
    };
}

/* =================================================
   MYSTERY CODE MANAGER
================================================= */

/**
 * Daftar status mystery code.
 */
const CODE_STATUS = Object.freeze({
    ACTIVE: "active",
    OPENED: "opened",
    EXPIRED: "expired",
    DISABLED: "disabled"
});


/**
 * Menentukan status terbaru sebuah mystery code.
 *
 * @param {Object} codeItem
 * @returns {string}
 */
function resolveMysteryCodeStatus(codeItem) {
    if (!isPlainObject(codeItem)) {
        return CODE_STATUS.DISABLED;
    }

    if (codeItem.enabled === false) {
        return CODE_STATUS.DISABLED;
    }

    if (codeItem.opened === true) {
        return CODE_STATUS.OPENED;
    }

    if (isDateExpired(codeItem.expiredAt)) {
        return CODE_STATUS.EXPIRED;
    }

    return CODE_STATUS.ACTIVE;
}


/**
 * Menyamakan struktur data mystery code.
 *
 * @param {Object} codeData
 * @param {Object|null} existingCode
 * @returns {Object}
 */
function normalizeMysteryCodeData(
    codeData = {},
    existingCode = null
) {
    const database = getDatabase();

    const settings =
        database.settings ||
        DEFAULT_SETTINGS;

    const currentTime =
        getCurrentISOTime();

    const currentCode =
        isPlainObject(existingCode)
            ? existingCode
            : {};

    const username = normalizeText(
        codeData.username ??
        currentCode.username
    );

    const rewardId = normalizeText(
        codeData.rewardId ??
        currentCode.rewardId
    );

    const reward =
        getRewardById(rewardId);

    const requestedCode =
        sanitizeCode(
            codeData.code ??
            currentCode.code
        );

    const attemptsValue = Number(
        codeData.attempts ??
        currentCode.attempts ??
        settings.defaultAttempts ??
        1
    );

    const totalAttempts =
        Number.isFinite(attemptsValue)
            ? Math.max(
                1,
                Math.floor(attemptsValue)
            )
            : 1;

    const remainingAttemptsValue =
        Number(
            codeData.remainingAttempts ??
            currentCode.remainingAttempts ??
            totalAttempts
        );

    const remainingAttempts =
        Number.isFinite(
            remainingAttemptsValue
        )
            ? Math.min(
                totalAttempts,
                Math.max(
                    0,
                    Math.floor(
                        remainingAttemptsValue
                    )
                )
            )
            : totalAttempts;

    let expiredAt =
        codeData.expiredAt ??
        currentCode.expiredAt;

    if (!isValidDate(expiredAt)) {
        const expiredDaysValue =
            Number(
                codeData.expiredDays ??
                settings.defaultExpiredDays ??
                7
            );

        const expiredDays =
            Number.isFinite(
                expiredDaysValue
            )
                ? Math.max(
                    1,
                    Math.floor(
                        expiredDaysValue
                    )
                )
                : 7;

        expiredAt =
            addDaysToDate(expiredDays);
    }

    const opened =
        typeof codeData.opened === "boolean"
            ? codeData.opened
            : currentCode.opened === true;

    const enabled =
        typeof codeData.enabled === "boolean"
            ? codeData.enabled
            : currentCode.enabled !== false;

    const openedBoxIndexValue =
        Number(
            codeData.openedBoxIndex ??
            currentCode.openedBoxIndex
        );

    const openedBoxIndex =
        Number.isFinite(
            openedBoxIndexValue
        )
            ? Math.max(
                0,
                Math.floor(
                    openedBoxIndexValue
                )
            )
            : null;

    const normalizedCode = {
        id:
            normalizeText(
                currentCode.id
            ) ||
            generateId("code"),

        username,

        usernameNormalized:
            normalizeUsername(username),

        code:
            requestedCode ||
            generateMysteryCode(),

        rewardId,

        rewardName:
            normalizeText(
                codeData.rewardName ??
                currentCode.rewardName ??
                reward?.name
            ),

        rewardIcon:
            normalizeText(
                codeData.rewardIcon ??
                currentCode.rewardIcon ??
                reward?.icon
            ) || "🎁",

        attempts:
            totalAttempts,

        remainingAttempts,

        expiredAt,

        enabled,

        opened,

        openedAt:
            codeData.openedAt ??
            currentCode.openedAt ??
            null,

        openedBoxIndex,

        selectedBox:
            codeData.selectedBox ??
            currentCode.selectedBox ??
            null,

        status:
            normalizeText(
                codeData.status ??
                currentCode.status
            ) || CODE_STATUS.ACTIVE,

        note:
            normalizeText(
                codeData.note ??
                currentCode.note
            ),

        createdAt:
            currentCode.createdAt ||
            currentTime,

        updatedAt:
            currentTime
    };

    normalizedCode.status =
        resolveMysteryCodeStatus(
            normalizedCode
        );

    return normalizedCode;
}


/**
 * Memvalidasi mystery code.
 *
 * @param {Object} codeData
 * @param {Object} options
 * @returns {Object}
 */
function validateMysteryCodeData(
    codeData,
    options = {}
) {
    const errors = {};

    if (!isPlainObject(codeData)) {
        return {
            valid: false,
            errors: {
                code:
                    "Data mystery code tidak valid."
            },
            message:
                "Data mystery code tidak valid."
        };
    }

    const username =
        normalizeText(
            codeData.username
        );

    const code =
        sanitizeCode(
            codeData.code
        );

    const rewardId =
        normalizeText(
            codeData.rewardId
        );

    if (!username) {
        errors.username =
            "Username wajib diisi.";
    } else if (username.length < 2) {
        errors.username =
            "Username minimal 2 karakter.";
    } else if (username.length > 60) {
        errors.username =
            "Username maksimal 60 karakter.";
    }

    if (
        options.requireCode !== false &&
        !code
    ) {
        errors.code =
            "Mystery code wajib diisi.";
    }

    if (code && code.length < 4) {
        errors.code =
            "Mystery code minimal 4 karakter.";
    }

    if (code.length > 50) {
        errors.code =
            "Mystery code maksimal 50 karakter.";
    }

    if (!rewardId) {
        errors.rewardId =
            "Hadiah wajib dipilih.";
    } else {
        const reward =
            getRewardById(rewardId);

        if (!reward) {
            errors.rewardId =
                "Hadiah tidak ditemukan.";
        } else if (
            reward.enabled === false &&
            options.allowDisabledReward !== true
        ) {
            errors.rewardId =
                "Hadiah sedang dinonaktifkan.";
        }
    }

    const attempts =
        Number(codeData.attempts);

    if (
        !Number.isFinite(attempts) ||
        attempts < 1
    ) {
        errors.attempts =
            "Jumlah kesempatan minimal 1.";
    } else if (attempts > 100) {
        errors.attempts =
            "Jumlah kesempatan maksimal 100.";
    }

    if (
        codeData.expiredAt &&
        !isValidDate(
            codeData.expiredAt
        )
    ) {
        errors.expiredAt =
            "Tanggal kedaluwarsa tidak valid.";
    }

    if (
        codeData.note &&
        normalizeText(
            codeData.note
        ).length > 500
    ) {
        errors.note =
            "Catatan maksimal 500 karakter.";
    }

    if (
        options.checkDuplicate !== false &&
        code
    ) {
        const database =
            getDatabase();

        const excludedId =
            normalizeText(
                options.excludeId
            );

        const duplicateCode =
            database.codes.find(
                (item) =>
                    sanitizeCode(
                        item.code
                    ) === code &&
                    item.id !== excludedId
            );

        if (duplicateCode) {
            errors.code =
                "Mystery code sudah digunakan.";
        }
    }

    const errorMessages =
        Object.values(errors);

    return {
        valid:
            errorMessages.length === 0,
        errors,
        message:
            errorMessages[0] ||
            "Data mystery code valid."
    };
}


/**
 * Menyegarkan status semua mystery code.
 *
 * @returns {Object}
 */
function refreshMysteryCodeStatuses() {
    const database =
        getDatabase();

    let totalChanged = 0;

    const updatedCodes =
        database.codes.map(
            (codeItem) => {
                const latestStatus =
                    resolveMysteryCodeStatus(
                        codeItem
                    );

                if (
                    codeItem.status !==
                    latestStatus
                ) {
                    totalChanged += 1;
                }

                return {
                    ...codeItem,
                    status:
                        latestStatus
                };
            }
        );

    if (totalChanged === 0) {
        return {
            success: true,
            totalChanged: 0,
            codes:
                deepClone(updatedCodes)
        };
    }

    const saveResult =
        updateDatabase(
            (workingDatabase) => {
                workingDatabase.codes =
                    updatedCodes;

                return workingDatabase;
            }
        );

    return {
        success:
            saveResult.success,
        totalChanged:
            saveResult.success
                ? totalChanged
                : 0,
        codes:
            saveResult.success
                ? deepClone(
                    updatedCodes
                )
                : []
    };
}


/**
 * Mengurutkan mystery code.
 *
 * @param {Array} codes
 * @param {string} sortBy
 * @param {string} direction
 * @returns {Array}
 */
function sortMysteryCodes(
    codes,
    sortBy = "createdAt",
    direction = "desc"
) {
    if (!Array.isArray(codes)) {
        return [];
    }

    const normalizedDirection =
        direction === "asc"
            ? "asc"
            : "desc";

    return [...codes].sort(
        (firstCode, secondCode) => {
            let firstValue =
                firstCode[sortBy];

            let secondValue =
                secondCode[sortBy];

            if (
                sortBy === "createdAt" ||
                sortBy === "updatedAt" ||
                sortBy === "expiredAt" ||
                sortBy === "openedAt"
            ) {
                firstValue =
                    isValidDate(firstValue)
                        ? new Date(
                            firstValue
                        ).getTime()
                        : 0;

                secondValue =
                    isValidDate(secondValue)
                        ? new Date(
                            secondValue
                        ).getTime()
                        : 0;
            } else if (
                typeof firstValue ===
                "string"
            ) {
                firstValue =
                    firstValue.toLowerCase();

                secondValue =
                    String(
                        secondValue ?? ""
                    ).toLowerCase();
            }

            if (
                firstValue <
                secondValue
            ) {
                return normalizedDirection ===
                    "asc"
                    ? -1
                    : 1;
            }

            if (
                firstValue >
                secondValue
            ) {
                return normalizedDirection ===
                    "asc"
                    ? 1
                    : -1;
            }

            return 0;
        }
    );
}


/**
 * Mengambil semua mystery code.
 *
 * @param {Object} options
 * @returns {Array}
 */
function getMysteryCodes(
    options = {}
) {
    const database =
        getDatabase();

    let codes = Array.isArray(
        database.codes
    )
        ? deepClone(
            database.codes
        )
        : [];

    codes = codes.map(
        (codeItem) => ({
            ...codeItem,
            status:
                resolveMysteryCodeStatus(
                    codeItem
                )
        })
    );

    const status =
        normalizeText(
            options.status
        ).toLowerCase();

    if (status) {
        codes = codes.filter(
            (codeItem) =>
                codeItem.status ===
                status
        );
    }

    if (
        typeof options.enabled ===
        "boolean"
    ) {
        codes = codes.filter(
            (codeItem) =>
                codeItem.enabled ===
                options.enabled
        );
    }

    if (
        typeof options.opened ===
        "boolean"
    ) {
        codes = codes.filter(
            (codeItem) =>
                codeItem.opened ===
                options.opened
        );
    }

    const rewardId =
        normalizeText(
            options.rewardId
        );

    if (rewardId) {
        codes = codes.filter(
            (codeItem) =>
                codeItem.rewardId ===
                rewardId
        );
    }

    const username =
        normalizeUsername(
            options.username
        );

    if (username) {
        codes = codes.filter(
            (codeItem) =>
                normalizeUsername(
                    codeItem.username
                ) === username
        );
    }

    const searchKeyword =
        normalizeText(
            options.search
        ).toLowerCase();

    if (searchKeyword) {
        codes = codes.filter(
            (codeItem) => {
                const searchableText = [
                    codeItem.username,
                    codeItem.code,
                    codeItem.rewardName,
                    codeItem.note,
                    codeItem.status
                ]
                    .map((value) =>
                        normalizeText(
                            value
                        ).toLowerCase()
                    )
                    .join(" ");

                return searchableText.includes(
                    searchKeyword
                );
            }
        );
    }

    codes = sortMysteryCodes(
        codes,
        options.sortBy ||
            "createdAt",
        options.direction ||
            "desc"
    );

    const limit =
        Number(options.limit);

    if (
        Number.isFinite(limit) &&
        limit > 0
    ) {
        codes = codes.slice(
            0,
            Math.floor(limit)
        );
    }

    return codes;
}


/**
 * Mengambil mystery code berdasarkan ID.
 *
 * @param {string} codeId
 * @returns {Object|null}
 */
function getMysteryCodeById(
    codeId
) {
    const normalizedId =
        normalizeText(codeId);

    if (!normalizedId) {
        return null;
    }

    const database =
        getDatabase();

    const codeItem =
        database.codes.find(
            (item) =>
                item.id ===
                normalizedId
        );

    if (!codeItem) {
        return null;
    }

    return deepClone({
        ...codeItem,
        status:
            resolveMysteryCodeStatus(
                codeItem
            )
    });
}


/**
 * Mengambil mystery code berdasarkan kode.
 *
 * @param {string} mysteryCode
 * @returns {Object|null}
 */
function getMysteryCodeByCode(
    mysteryCode
) {
    const normalizedCode =
        sanitizeCode(
            mysteryCode
        );

    if (!normalizedCode) {
        return null;
    }

    const database =
        getDatabase();

    const codeItem =
        database.codes.find(
            (item) =>
                sanitizeCode(
                    item.code
                ) ===
                normalizedCode
        );

    if (!codeItem) {
        return null;
    }

    return deepClone({
        ...codeItem,
        status:
            resolveMysteryCodeStatus(
                codeItem
            )
    });
}


/**
 * Mengambil mystery code milik username.
 *
 * @param {string} username
 * @param {Object} options
 * @returns {Array}
 */
function getMysteryCodesByUsername(
    username,
    options = {}
) {
    return getMysteryCodes({
        ...options,
        username
    });
}


/**
 * Membuat mystery code baru.
 *
 * @param {Object} codeData
 * @returns {Object}
 */
function createMysteryCode(
    codeData
) {
    const database =
        getDatabase();

    const settings =
        database.settings ||
        DEFAULT_SETTINGS;

    const preparedData = {
        ...codeData,

        code:
            sanitizeCode(
                codeData?.code
            ) ||
            generateMysteryCode(),

        attempts:
            Number(
                codeData?.attempts ??
                settings.defaultAttempts ??
                1
            ),

        expiredAt:
            codeData?.expiredAt ||
            addDaysToDate(
                Number(
                    codeData?.expiredDays ??
                    settings.defaultExpiredDays ??
                    7
                )
            )
    };

    const validation =
        validateMysteryCodeData(
            preparedData,
            {
                checkDuplicate: true,
                requireCode: true
            }
        );

    if (!validation.valid) {
        return {
            success: false,
            message:
                validation.message,
            errors:
                validation.errors,
            code: null
        };
    }

    const codeToCreate =
        normalizeMysteryCodeData(
            preparedData
        );

    const saveResult =
        updateDatabase(
            (workingDatabase) => {
                workingDatabase.codes.unshift(
                    codeToCreate
                );

                workingDatabase.activityLogs.unshift({
                    id:
                        generateId(
                            "log"
                        ),

                    type:
                        "mystery_code",

                    action:
                        "code_created",

                    description:
                        `Mystery code "${codeToCreate.code}" untuk "${codeToCreate.username}" berhasil dibuat.`,

                    metadata: {
                        codeId:
                            codeToCreate.id,

                        code:
                            codeToCreate.code,

                        username:
                            codeToCreate.username,

                        rewardId:
                            codeToCreate.rewardId,

                        rewardName:
                            codeToCreate.rewardName
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return workingDatabase;
            }
        );

    return {
        success:
            saveResult.success,

        message:
            saveResult.success
                ? "Mystery code berhasil dibuat."
                : saveResult.message,

        code:
            saveResult.success
                ? deepClone(
                    codeToCreate
                )
                : null
    };
}


/**
 * Memperbarui mystery code.
 *
 * @param {string} codeId
 * @param {Object} codeData
 * @returns {Object}
 */
function updateMysteryCode(
    codeId,
    codeData
) {
    const normalizedId =
        normalizeText(codeId);

    const existingCode =
        getMysteryCodeById(
            normalizedId
        );

    if (!existingCode) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    const mergedCodeData = {
        ...existingCode,
        ...codeData
    };

    const validation =
        validateMysteryCodeData(
            mergedCodeData,
            {
                checkDuplicate: true,
                excludeId:
                    normalizedId,
                allowDisabledReward:
                    true
            }
        );

    if (!validation.valid) {
        return {
            success: false,
            message:
                validation.message,
            errors:
                validation.errors,
            code: null
        };
    }

    const updatedCode =
        normalizeMysteryCodeData(
            mergedCodeData,
            existingCode
        );

    const saveResult =
        updateDatabase(
            (database) => {
                const codeIndex =
                    database.codes.findIndex(
                        (item) =>
                            item.id ===
                            normalizedId
                    );

                if (codeIndex === -1) {
                    throw new Error(
                        "Mystery code tidak ditemukan."
                    );
                }

                database.codes[
                    codeIndex
                ] = updatedCode;

                database.activityLogs.unshift({
                    id:
                        generateId(
                            "log"
                        ),

                    type:
                        "mystery_code",

                    action:
                        "code_updated",

                    description:
                        `Mystery code "${updatedCode.code}" berhasil diperbarui.`,

                    metadata: {
                        codeId:
                            updatedCode.id,

                        code:
                            updatedCode.code,

                        username:
                            updatedCode.username
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return database;
            }
        );

    return {
        success:
            saveResult.success,

        message:
            saveResult.success
                ? "Mystery code berhasil diperbarui."
                : saveResult.message,

        code:
            saveResult.success
                ? deepClone(
                    updatedCode
                )
                : null
    };
}


/**
 * Menghapus mystery code.
 *
 * @param {string} codeId
 * @returns {Object}
 */
function deleteMysteryCode(
    codeId
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan."
        };
    }

    const saveResult =
        updateDatabase(
            (database) => {
                database.codes =
                    database.codes.filter(
                        (item) =>
                            item.id !==
                            codeItem.id
                    );

                database.activityLogs.unshift({
                    id:
                        generateId(
                            "log"
                        ),

                    type:
                        "mystery_code",

                    action:
                        "code_deleted",

                    description:
                        `Mystery code "${codeItem.code}" berhasil dihapus.`,

                    metadata: {
                        codeId:
                            codeItem.id,

                        code:
                            codeItem.code,

                        username:
                            codeItem.username
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return database;
            }
        );

    return {
        success:
            saveResult.success,

        message:
            saveResult.success
                ? "Mystery code berhasil dihapus."
                : saveResult.message
    };
}


/**
 * Menghapus semua mystery code.
 *
 * @returns {Object}
 */
function deleteAllMysteryCodes() {
    const database =
        getDatabase();

    const totalCodes =
        database.codes.length;

    const saveResult =
        updateDatabase(
            (workingDatabase) => {
                workingDatabase.codes = [];

                workingDatabase.activityLogs.unshift({
                    id:
                        generateId(
                            "log"
                        ),

                    type:
                        "mystery_code",

                    action:
                        "all_codes_deleted",

                    description:
                        `${totalCodes} mystery code berhasil dihapus.`,

                    metadata: {
                        totalDeleted:
                            totalCodes
                    },

                    createdAt:
                        getCurrentISOTime()
                });

                return workingDatabase;
            }
        );

    return {
        success:
            saveResult.success,

        message:
            saveResult.success
                ? `${totalCodes} mystery code berhasil dihapus.`
                : saveResult.message,

        totalDeleted:
            saveResult.success
                ? totalCodes
                : 0
    };
}


/**
 * Mengaktifkan atau menonaktifkan mystery code.
 *
 * @param {string} codeId
 * @param {boolean} enabled
 * @returns {Object}
 */
function setMysteryCodeEnabled(
    codeId,
    enabled
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    const finalEnabled =
        typeof enabled ===
        "boolean"
            ? enabled
            : !codeItem.enabled;

    return updateMysteryCode(
        codeItem.id,
        {
            enabled:
                finalEnabled
        }
    );
}


/**
 * Membalik status aktif mystery code.
 *
 * @param {string} codeId
 * @returns {Object}
 */
function toggleMysteryCode(
    codeId
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    return setMysteryCodeEnabled(
        codeItem.id,
        !codeItem.enabled
    );
}


/**
 * Memvalidasi kode dari halaman customer.
 *
 * @param {string} username
 * @param {string} mysteryCode
 * @returns {Object}
 */
function verifyMysteryCode(
    username,
    mysteryCode
) {
    const normalizedUsername =
        normalizeUsername(
            username
        );

    const normalizedCode =
        sanitizeCode(
            mysteryCode
        );

    if (!normalizedUsername) {
        return {
            success: false,
            reason:
                "invalid_username",
            message:
                "Username wajib diisi.",
            code: null
        };
    }

    if (!normalizedCode) {
        return {
            success: false,
            reason:
                "invalid_code",
            message:
                "Mystery code wajib diisi.",
            code: null
        };
    }

    const codeItem =
        getMysteryCodeByCode(
            normalizedCode
        );

    if (!codeItem) {
        return {
            success: false,
            reason:
                "not_found",
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    if (
        normalizeUsername(
            codeItem.username
        ) !== normalizedUsername
    ) {
        return {
            success: false,
            reason:
                "username_mismatch",
            message:
                "Username tidak sesuai dengan mystery code.",
            code: null
        };
    }

    const database =
        getDatabase();

    const settings =
        database.settings ||
        DEFAULT_SETTINGS;

    const latestStatus =
        resolveMysteryCodeStatus(
            codeItem
        );

    if (
        latestStatus ===
        CODE_STATUS.DISABLED
    ) {
        return {
            success: false,
            reason:
                "disabled",
            message:
                "Mystery code sedang dinonaktifkan.",
            code:
                deepClone(codeItem)
        };
    }

    if (
        latestStatus ===
        CODE_STATUS.EXPIRED &&
        settings.allowExpiredCode !==
            true
    ) {
        return {
            success: false,
            reason:
                "expired",
            message:
                "Mystery code sudah kedaluwarsa.",
            code:
                deepClone(codeItem)
        };
    }

    if (
        latestStatus ===
        CODE_STATUS.OPENED &&
        settings.onePrizePerCode ===
            true
    ) {
        return {
            success: false,
            reason:
                "already_opened",
            message:
                "Hadiah dari mystery code ini sudah dibuka.",
            code:
                deepClone(codeItem)
        };
    }

    if (
        Number(
            codeItem.remainingAttempts
        ) <= 0
    ) {
        return {
            success: false,
            reason:
                "no_attempts",
            message:
                "Kesempatan membuka box sudah habis.",
            code:
                deepClone(codeItem)
        };
    }

    return {
        success: true,
        reason:
            "verified",
        message:
            "Mystery code berhasil diverifikasi.",
        code:
            deepClone({
                ...codeItem,
                status:
                    latestStatus
            })
    };
}


/**
 * Mengurangi satu kesempatan mystery code.
 *
 * @param {string} codeId
 * @returns {Object}
 */
function consumeMysteryCodeAttempt(
    codeId
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    if (
        Number(
            codeItem.remainingAttempts
        ) <= 0
    ) {
        return {
            success: false,
            message:
                "Kesempatan membuka box sudah habis.",
            code:
                deepClone(codeItem)
        };
    }

    return updateMysteryCode(
        codeItem.id,
        {
            remainingAttempts:
                Math.max(
                    0,
                    Number(
                        codeItem.remainingAttempts
                    ) - 1
                )
        }
    );
}


/**
 * Menyimpan hasil mystery box yang dibuka.
 *
 * @param {string} codeId
 * @param {number} boxIndex
 * @param {Object} options
 * @returns {Object}
 */
function openMysteryCode(
    codeId,
    boxIndex,
    options = {}
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            reason:
                "not_found",
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    const latestStatus =
        resolveMysteryCodeStatus(
            codeItem
        );

    if (
        latestStatus ===
        CODE_STATUS.DISABLED
    ) {
        return {
            success: false,
            reason:
                "disabled",
            message:
                "Mystery code sedang dinonaktifkan.",
            code:
                deepClone(codeItem)
        };
    }

    if (
        latestStatus ===
        CODE_STATUS.EXPIRED
    ) {
        const database =
            getDatabase();

        if (
            database.settings
                ?.allowExpiredCode !==
            true
        ) {
            return {
                success: false,
                reason:
                    "expired",
                message:
                    "Mystery code sudah kedaluwarsa.",
                code:
                    deepClone(codeItem)
            };
        }
    }

    if (
        codeItem.opened === true &&
        getDatabase().settings
            ?.onePrizePerCode === true
    ) {
        return {
            success: false,
            reason:
                "already_opened",
            message:
                "Mystery code sudah pernah dibuka.",
            code:
                deepClone(codeItem)
        };
    }

    if (
        Number(
            codeItem.remainingAttempts
        ) <= 0
    ) {
        return {
            success: false,
            reason:
                "no_attempts",
            message:
                "Kesempatan membuka box sudah habis.",
            code:
                deepClone(codeItem)
        };
    }

    const database =
        getDatabase();

    const totalBoxes =
        Math.max(
            1,
            Number(
                database.settings
                    ?.totalBoxes ??
                6
            )
        );

    const normalizedBoxIndex =
        Math.floor(
            Number(boxIndex)
        );

    if (
        !Number.isFinite(
            normalizedBoxIndex
        ) ||
        normalizedBoxIndex < 0 ||
        normalizedBoxIndex >=
            totalBoxes
    ) {
        return {
            success: false,
            reason:
                "invalid_box",
            message:
                "Box yang dipilih tidak valid.",
            code:
                deepClone(codeItem)
        };
    }

    const currentTime =
        getCurrentISOTime();

    const newRemainingAttempts =
        Math.max(
            0,
            Number(
                codeItem.remainingAttempts
            ) - 1
        );

    const shouldMarkOpened =
        options.markOpened !== false;

    const updatedCode = {
        ...codeItem,

        remainingAttempts:
            newRemainingAttempts,

        opened:
            shouldMarkOpened
                ? true
                : codeItem.opened,

        openedAt:
            shouldMarkOpened
                ? currentTime
                : codeItem.openedAt,

        openedBoxIndex:
            normalizedBoxIndex,

        selectedBox:
            normalizedBoxIndex + 1,

        updatedAt:
            currentTime
    };

    updatedCode.status =
        resolveMysteryCodeStatus(
            updatedCode
        );

    const saveResult =
        updateDatabase(
            (workingDatabase) => {
                const codeIndex =
                    workingDatabase.codes.findIndex(
                        (item) =>
                            item.id ===
                            codeItem.id
                    );

                if (codeIndex === -1) {
                    throw new Error(
                        "Mystery code tidak ditemukan."
                    );
                }

                workingDatabase.codes[
                    codeIndex
                ] = updatedCode;

                workingDatabase.activityLogs.unshift({
                    id:
                        generateId(
                            "log"
                        ),

                    type:
                        "mystery_box",

                    action:
                        "box_opened",

                    description:
                        `${codeItem.username} membuka Box ${normalizedBoxIndex + 1} dan mendapatkan "${codeItem.rewardName}".`,

                    metadata: {
                        codeId:
                            codeItem.id,

                        code:
                            codeItem.code,

                        username:
                            codeItem.username,

                        rewardId:
                            codeItem.rewardId,

                        rewardName:
                            codeItem.rewardName,

                        boxIndex:
                            normalizedBoxIndex,

                        boxNumber:
                            normalizedBoxIndex + 1,

                        remainingAttempts:
                            newRemainingAttempts
                    },

                    createdAt:
                        currentTime
                });

                return workingDatabase;
            }
        );

    return {
        success:
            saveResult.success,

        reason:
            saveResult.success
                ? "opened"
                : "save_failed",

        message:
            saveResult.success
                ? "Mystery box berhasil dibuka."
                : saveResult.message,

        code:
            saveResult.success
                ? deepClone(
                    updatedCode
                )
                : null,

        reward:
            saveResult.success
                ? {
                    id:
                        updatedCode.rewardId,

                    name:
                        updatedCode.rewardName,

                    icon:
                        updatedCode.rewardIcon
                }
                : null,

        boxIndex:
            saveResult.success
                ? normalizedBoxIndex
                : null,

        boxNumber:
            saveResult.success
                ? normalizedBoxIndex + 1
                : null
    };
}


/**
 * Mereset status pembukaan satu mystery code.
 *
 * @param {string} codeId
 * @param {Object} options
 * @returns {Object}
 */
function resetMysteryCodeOpening(
    codeId,
    options = {}
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    const restoredAttempts =
        options.restoreAttempts ===
        false
            ? codeItem.remainingAttempts
            : codeItem.attempts;

    return updateMysteryCode(
        codeItem.id,
        {
            opened: false,
            openedAt: null,
            openedBoxIndex: null,
            selectedBox: null,
            remainingAttempts:
                restoredAttempts,
            status:
                CODE_STATUS.ACTIVE
        }
    );
}


/**
 * Memperpanjang masa berlaku mystery code.
 *
 * @param {string} codeId
 * @param {number} additionalDays
 * @returns {Object}
 */
function extendMysteryCodeExpiration(
    codeId,
    additionalDays
) {
    const codeItem =
        getMysteryCodeById(
            codeId
        );

    if (!codeItem) {
        return {
            success: false,
            message:
                "Mystery code tidak ditemukan.",
            code: null
        };
    }

    const days =
        Math.floor(
            Number(
                additionalDays
            )
        );

    if (
        !Number.isFinite(days) ||
        days < 1
    ) {
        return {
            success: false,
            message:
                "Jumlah hari tambahan tidak valid.",
            code: null
        };
    }

    const baseDate =
        isValidDate(
            codeItem.expiredAt
        ) &&
        new Date(
            codeItem.expiredAt
        ).getTime() > Date.now()
            ? new Date(
                codeItem.expiredAt
            )
            : new Date();

    const newExpiredAt =
        addDaysToDate(
            days,
            baseDate
        );

    return updateMysteryCode(
        codeItem.id,
        {
            expiredAt:
                newExpiredAt
        }
    );
}


/**
 * Mengambil statistik mystery code.
 *
 * @returns {Object}
 */
function getMysteryCodeStatistics() {
    const codes =
        getMysteryCodes({
            sortBy:
                "createdAt",
            direction:
                "desc"
        });

    const statistics = {
        total:
            codes.length,

        active: 0,
        opened: 0,
        expired: 0,
        disabled: 0,

        totalAttempts: 0,
        remainingAttempts: 0,

        rewards: {},
        recentCodes:
            codes.slice(0, 5)
    };

    codes.forEach(
        (codeItem) => {
            if (
                statistics[
                    codeItem.status
                ] !== undefined
            ) {
                statistics[
                    codeItem.status
                ] += 1;
            }

            statistics.totalAttempts +=
                Number(
                    codeItem.attempts
                ) || 0;

            statistics.remainingAttempts +=
                Number(
                    codeItem.remainingAttempts
                ) || 0;

            const rewardName =
                normalizeText(
                    codeItem.rewardName
                ) ||
                "Tidak diketahui";

            if (
                !statistics.rewards[
                    rewardName
                ]
            ) {
                statistics.rewards[
                    rewardName
                ] = {
                    total: 0,
                    opened: 0
                };
            }

            statistics.rewards[
                rewardName
            ].total += 1;

            if (
                codeItem.opened ===
                true
            ) {
                statistics.rewards[
                    rewardName
                ].opened += 1;
            }
        }
    );

    return statistics;
}
