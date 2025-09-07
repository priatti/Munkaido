// Utility Functions v9.00

// Time and date utilities
const timeUtils = {
    parseTimeToMinutes(timeStr) {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    },

    formatAsHoursAndMinutes(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    },

    formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        const lang = window.i18n.getCurrentLanguage();
        const h_unit = lang === 'de' ? 'Std' : 'ó';
        const m_unit = lang === 'de' ? 'Min' : 'p';
        return `${h}${h_unit} ${m}${m_unit}`;
    },

    calculateWorkMinutes(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        const start = new Date(`2000-01-01T${startTime}`);
        let end = new Date(`2000-01-01T${endTime}`);
        if (end < start) end.setDate(end.getDate() + 1);
        return Math.floor((end - start) / 60000);
    },

    calculateNightWorkMinutes(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        const start = new Date(`1970-01-01T${startTime}`);
        let end = new Date(`1970-01-01T${endTime}`);
        if (end <= start) end.setDate(end.getDate() + 1);
        
        let nightMinutes = 0;
        let current = new Date(start);
        
        while (current < end) {
            const hour = current.getHours();
            if (hour >= 20 || hour < 5) {
                nightMinutes++;
            }
            current.setMinutes(current.getMinutes() + 1);
        }
        
        return nightMinutes;
    },

    toISODate(date) {
        return date.toISOString().split('T')[0];
    },

    getWeekRange(date, offset = 0) {
        const d = new Date(date);
        d.setDate(d.getDate() + (offset * 7));
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
    },

    getWeekIdentifier(date) {
        const d = new Date(date.valueOf());
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return d.getFullYear() + '-' + (1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7));
    },

    formatTimeInput(inputElement, allowHoursOver24 = false) {
        let value = inputElement.value.replace(/[^0-9]/g, '');
        if (value.length < 3) return;
        if (value.length === 3 && !allowHoursOver24) value = '0' + value;
        
        const hours = parseInt(value.substring(0, value.length - 2), 10);
        const minutes = parseInt(value.substring(value.length - 2), 10);
        
        if (minutes >= 0 && minutes <= 59 && hours >= 0 && (allowHoursOver24 || hours <= 23)) {
            inputElement.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        } else {
            inputElement.value = '';
        }
    }
};

// Data calculation utilities
const dataUtils = {
    calculateSummary(records, filterFn) {
        return records.filter(filterFn).reduce((acc, r) => ({
            workMinutes: acc.workMinutes + (r.workMinutes || 0),
            nightWorkMinutes: acc.nightWorkMinutes + (r.nightWorkMinutes || 0),
            driveMinutes: acc.driveMinutes + (r.driveMinutes || 0),
            kmDriven: acc.kmDriven + (r.kmDriven || 0),
            days: acc.days + 1
        }), { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0, days: 0 });
    },

    calculateSummaryForDate(records, date) {
        const dateStr = timeUtils.toISODate(date);
        return this.calculateSummary(records, r => r.date === dateStr);
    },

    calculateSummaryForDateRange(records, { start, end }) {
        const startStr = timeUtils.toISODate(start);
        const endStr = timeUtils.toISODate(end);
        return this.calculateSummary(records, r => r.date >= startStr && r.date <= endStr);
    },

    calculateSummaryForMonth(records, date) {
        const monthStr = date.toISOString().slice(0, 7);
        return this.calculateSummary(records, r => r.date.startsWith(monthStr));
    },

    getSortedRecords(records) {
        return [...(records || [])].sort((a, b) => 
            new Date(`${b.date || "1970-01-01"}T${b.startTime || "00:00"}`) - 
            new Date(`${a.date || "1970-01-01"}T${a.startTime || "00:00"}`)
        );
    },

    getLatestRecord(records) {
        if (!records || records.length === 0) return null;
        return this.getSortedRecords(records)[0];
    }
};

// DOM utilities
const domUtils = {
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id "${id}" not found`);
        }
        return element;
    },

    setElementValue(id, value) {
        const element = this.getElement(id);
        if (element) {
            element.value = value || '';
        }
    },

    getElementValue(id) {
        const element = this.getElement(id);
        return element ? element.value : '';
    },

    showElement(id) {
        const element = this.getElement(id);
        if (element) {
            element.classList.remove('hidden');
            element.style.display = '';
        }
    },

    hideElement(id) {
        const element = this.getElement(id);
        if (element) {
            element.classList.add('hidden');
            element.style.display = 'none';
        }
    },

    toggleElement(id, show) {
        if (show) {
            this.showElement(id);
        } else {
            this.hideElement(id);
        }
    },

    addClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.add(className);
        }
    },

    removeClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.remove(className);
        }
    },

    toggleClass(id, className, force) {
        const element = this.getElement(id);
        if (element) {
            element.classList.toggle(className, force);
        }
    }
};

// Geographic utilities
const geoUtils = {
    isoToVehicleCode: {
        'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO',
        'it': 'I', 'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH',
        'fr': 'F', 'nl': 'NL', 'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK'
    },

    async fetchCountryCodeFor(inputId) {
        const inputElement = domUtils.getElement(inputId);
        if (!inputElement || !navigator.geolocation) return;

        inputElement.value = "...";
        
        try {
            const position = await new Promise((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
            );

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`
            );

            if (!response.ok) throw new Error('API error');

            const data = await response.json();
            const countryCode = data.address.country_code;

            if (countryCode && this.isoToVehicleCode[countryCode]) {
                inputElement.value = this.isoToVehicleCode[countryCode];
            } else {
                inputElement.value = (countryCode || 'N/A').toUpperCase();
            }
        } catch (error) {
            inputElement.value = "";
            window.uiManager.showAlert(window.i18n.translate('alertLocationFailed'), 'info');
        }
    },

    async fetchLocation() {
        if (!navigator.geolocation) {
            window.uiManager.showAlert(window.i18n.translate('alertGeolocationNotSupported'), 'info');
            return;
        }

        const endLocationInput = domUtils.getElement('endLocation');
        if (!endLocationInput) return;

        endLocationInput.value = "...";
        
        try {
            const position = await new Promise((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
            );

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=hu`
            );

            if (!response.ok) throw new Error('API error');

            const data = await response.json();
            endLocationInput.value = data.address.city || data.address.town || data.address.village || 'Unknown location';
        } catch (error) {
            endLocationInput.value = "";
            window.uiManager.showAlert(window.i18n.translate('alertLocationFailed'), 'info');
        }
    }
};

// Validation utilities
const validationUtils = {
    isValidTime(timeStr) {
        if (!timeStr || !timeStr.includes(':')) return false;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return false;
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        return !isNaN(hours) && !isNaN(minutes) && 
               hours >= 0 && hours <= 23 && 
               minutes >= 0 && minutes <= 59;
    },

    isValidDate(dateStr) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date);
    },

    isValidNumber(value, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },

    validateWorkEntry(data) {
        const errors = [];

        if (!data.date || !this.isValidDate(data.date)) {
            errors.push('invalidDate');
        }

        if (!data.startTime || !this.isValidTime(data.startTime)) {
            errors.push('invalidStartTime');
        }

        if (!data.endTime || !this.isValidTime(data.endTime)) {
            errors.push('invalidEndTime');
        }

        if (data.kmEnd > 0 && data.kmStart > 0 && data.kmEnd < data.kmStart) {
            errors.push('kmEndLowerThanStart');
        }

        const weeklyStartMinutes = timeUtils.parseTimeToMinutes(data.weeklyDriveStartStr);
        const weeklyEndMinutes = timeUtils.parseTimeToMinutes(data.weeklyDriveEndStr);
        if (weeklyEndMinutes > 0 && weeklyStartMinutes > 0 && weeklyEndMinutes < weeklyStartMinutes) {
            errors.push('weeklyDriveEndLowerThanStart');
        }

        return errors;
    }
};

// Storage utilities
const storageUtils = {
    getSplitRestData() {
        try {
            return JSON.parse(localStorage.getItem('splitRestData') || '{}');
        } catch (error) {
            console.error('Error loading split rest data:', error);
            return {};
        }
    },

    saveSplitRestData(data) {
        try {
            localStorage.setItem('splitRestData', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving split rest data:', error);
        }
    },

    getWeeklyRestData() {
        try {
            return JSON.parse(localStorage.getItem('weeklyRestData') || '{}');
        } catch (error) {
            console.error('Error loading weekly rest data:', error);
            return {};
        }
    },

    saveWeeklyRestData(data) {
        try {
            localStorage.setItem('weeklyRestData', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving weekly rest data:', error);
        }
    }
};

// Export utilities globally
window.timeUtils = timeUtils;
window.dataUtils = dataUtils;
window.domUtils = domUtils;
window.geoUtils = geoUtils;
window.validationUtils = validationUtils;
window.storageUtils = storageUtils;
