/* Shared form engine for the AI form-filling test site.
 *
 * Each page declares its fields and calls GovukForm.init(config). The engine:
 *   - prefills values from sessionStorage (keys prefixed "govuk_")
 *   - validates on submit: required / requiredIf / validate(value, values)
 *   - on errors: renders a GOV.UK error summary ("There is a problem" + links)
 *     plus inline govuk-error-message blocks, and blocks navigation
 *   - on success: saves values and navigates to config.next (string or
 *     function(values) for branching); ?change=true returns to review.html
 *
 * Field config: {
 *   key:        storage key + element id (radio/checkbox groups: the name attr)
 *   kind:       'text' | 'radio' | 'checkboxes'   (text covers input/select/textarea/date)
 *   required:   error message when empty (omit for optional fields)
 *   requiredIf: function(values) -> error message | null  (conditional reveals)
 *   validate:   function(value, values) -> error message | null
 *   maxLength:  render a character-count message under the element
 * }
 */
(function (global) {
  'use strict';

  function get(key) { return sessionStorage.getItem('govuk_' + key) || ''; }
  function set(key, value) { sessionStorage.setItem('govuk_' + key, value); }

  function readValue(field) {
    if (field.kind === 'radio') {
      var checked = document.querySelector('input[name="' + field.key + '"]:checked');
      return checked ? checked.value : '';
    }
    if (field.kind === 'checkboxes') {
      return Array.prototype.slice.call(
        document.querySelectorAll('input[name="' + field.key + '"]:checked')
      ).map(function (el) { return el.value; });
    }
    var el = document.getElementById(field.key);
    return el ? el.value : '';
  }

  function prefill(field) {
    var saved = get(field.key);
    if (!saved) return;
    if (field.kind === 'radio') {
      var radio = document.querySelector('input[name="' + field.key + '"][value="' + saved + '"]');
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      return;
    }
    if (field.kind === 'checkboxes') {
      try {
        JSON.parse(saved).forEach(function (v) {
          var box = document.querySelector('input[name="' + field.key + '"][value="' + v + '"]');
          if (box) box.checked = true;
        });
      } catch (e) { /* ignore malformed storage */ }
      return;
    }
    var el = document.getElementById(field.key);
    if (el) { el.value = saved; el.dispatchEvent(new Event('input')); }
  }

  function save(field, value) {
    set(field.key, field.kind === 'checkboxes' ? JSON.stringify(value) : value);
  }

  function isEmpty(value) {
    return Array.isArray(value) ? value.length === 0 : String(value).trim() === '';
  }

  // The id the error-summary link points at (first input of a group, or the element).
  function targetId(field) {
    if (field.kind === 'radio' || field.kind === 'checkboxes') {
      var first = document.querySelector('input[name="' + field.key + '"]');
      return first ? first.id : field.key;
    }
    return field.key;
  }

  function clearErrors(form) {
    var summary = document.querySelector('.govuk-error-summary');
    if (summary) summary.parentNode.removeChild(summary);
    Array.prototype.slice.call(form.querySelectorAll('.govuk-error-message')).forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    Array.prototype.slice.call(form.querySelectorAll('.govuk-form-group--error')).forEach(function (el) {
      el.classList.remove('govuk-form-group--error');
    });
    Array.prototype.slice.call(form.querySelectorAll(
      '.govuk-input--error,.govuk-select--error,.govuk-textarea--error'
    )).forEach(function (el) {
      el.classList.remove('govuk-input--error', 'govuk-select--error', 'govuk-textarea--error');
    });
  }

  function markField(field, message) {
    var id = targetId(field);
    var el = document.getElementById(id);
    if (!el) return;
    var group = el.closest('.govuk-form-group') || el.closest('.govuk-fieldset');
    if (group) group.classList.add('govuk-form-group--error');

    var msg = document.createElement('p');
    msg.className = 'govuk-error-message';
    msg.id = field.key + '-error';
    msg.innerHTML = '<span class="govuk-visually-hidden">Error:</span> ' + message;

    if (field.kind === 'radio' || field.kind === 'checkboxes') {
      var list = group ? group.querySelector('.govuk-radios,.govuk-checkboxes') : null;
      if (list) list.parentNode.insertBefore(msg, list);
    } else {
      el.parentNode.insertBefore(msg, el);
      if (el.classList.contains('govuk-select')) el.classList.add('govuk-select--error');
      else if (el.tagName === 'TEXTAREA') el.classList.add('govuk-textarea--error');
      else el.classList.add('govuk-input--error');
    }
  }

  function renderSummary(form, errors) {
    var summary = document.createElement('div');
    summary.className = 'govuk-error-summary';
    summary.setAttribute('role', 'alert');
    summary.setAttribute('tabindex', '-1');
    summary.setAttribute('aria-labelledby', 'error-summary-title');

    var items = errors.map(function (err) {
      return '<li><a href="#' + err.targetId + '">' + err.message + '</a></li>';
    }).join('');

    summary.innerHTML =
      '<h2 class="govuk-error-summary__title" id="error-summary-title">There is a problem</h2>' +
      '<div class="govuk-error-summary__body"><ul class="govuk-error-summary__list">' +
      items + '</ul></div>';

    var main = document.getElementById('main-content');
    var anchor = main.querySelector('h1, form');
    main.insertBefore(summary, anchor);
    summary.focus();
  }

  function renderCharCount(field) {
    var el = document.getElementById(field.key);
    if (!el || !field.maxLength) return;
    var counter = document.createElement('div');
    counter.className = 'govuk-character-count__message';
    counter.id = field.key + '-count';
    counter.setAttribute('aria-live', 'polite');
    el.parentNode.insertBefore(counter, el.nextSibling);
    function update() {
      var remaining = field.maxLength - el.value.length;
      counter.textContent = remaining >= 0
        ? 'You have ' + remaining + ' characters remaining'
        : 'You have ' + Math.abs(remaining) + ' characters too many';
      counter.classList.toggle('govuk-character-count__message--over', remaining < 0);
    }
    el.addEventListener('input', update);
    update();
  }

  function init(config) {
    var form = config.form || document.querySelector('form');

    config.fields.forEach(function (field) {
      prefill(field);
      if (field.maxLength) renderCharCount(field);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors(form);

      var values = {};
      config.fields.forEach(function (field) { values[field.key] = readValue(field); });

      var errors = [];
      config.fields.forEach(function (field) {
        var value = values[field.key];
        var message = null;
        if (field.required && isEmpty(value)) message = field.required;
        if (!message && field.requiredIf) {
          var condMsg = field.requiredIf(values);
          if (condMsg && isEmpty(value)) message = condMsg;
        }
        if (!message && field.validate && !isEmpty(value)) message = field.validate(value, values);
        if (message) {
          errors.push({ targetId: targetId(field), message: message });
          markField(field, message);
        }
      });

      if (errors.length > 0) {
        renderSummary(form, errors);
        return;
      }

      config.fields.forEach(function (field) { save(field, values[field.key]); });

      if (new URLSearchParams(window.location.search).get('change') === 'true') {
        window.location.href = 'review.html';
        return;
      }
      var next = typeof config.next === 'function' ? config.next(values) : config.next;
      window.location.href = next;
    });
  }

  // Shared validators
  var validators = {
    email: function (v) {
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim())
        ? null
        : 'Enter an email address in the correct format, like name@example.com';
    },
    ukPhone: function (v) {
      var digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13
        ? null
        : 'Enter a phone number, like +44 7700 900123';
    },
    ukPostcode: function (v) {
      return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(v.trim())
        ? null
        : 'Enter a real UK postcode, like SW1A 2AA';
    },
    intRange: function (min, max, message) {
      return function (v) {
        var n = parseInt(v, 10);
        return (!isNaN(n) && n >= min && n <= max) ? null : message;
      };
    },
    docRef: function (v) {
      return /^[A-Za-z0-9]{6,12}$/.test(v.trim())
        ? null
        : 'Enter a document reference between 6 and 12 letters or numbers';
    },
    futureDate: function (v) {
      var d = new Date(v);
      return (!isNaN(d.getTime()) && d > new Date())
        ? null
        : 'The date must be in the future';
    },
    pastDate: function (v) {
      var d = new Date(v);
      return (!isNaN(d.getTime()) && d < new Date())
        ? null
        : 'The date must be in the past';
    },
    maxLength: function (max, label) {
      return function (v) {
        return v.length <= max ? null : (label + ' must be ' + max + ' characters or fewer');
      };
    }
  };

  global.GovukForm = { init: init, validators: validators, get: get, set: set };
})(window);
