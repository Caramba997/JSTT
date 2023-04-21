class Forms {

  /**
   * Adds values of elements with name attribute to an object
   * @param {Element} element Parent element of input elements
   * @param {Object} json Object to insert data into, optional
   * @returns Object with inserted data
   */
  toJson(element, json = {}) {
    const inputs = element.find('[name]');
    inputs.each((index, elem) => {
      const input = $(elem);
      if (input.prop('tagName') === 'TEXTAREA') {
        if (input.data('type') === 'json') {
          if (input.val() !== '') json[input.attr('name')] = JSON.parse(input.val());
        }
        else {
          if (input.val() !== '') json[input.attr('name')] = input.val();
        }
      }
      else {
        switch (input.attr('type')) {
          case 'text': {
            if (input.data('type') === 'array') {
              const arr = input.val() !== '' ? input.val().split(',') : [];
              json[input.attr('name')] = arr;
            }
            else {
              json[input.attr('name')] = input.val();
            }
            break;
          }
          case 'checkbox': {
            json[input.attr('name')] = input.prop('checked');
            break;
          }
          case 'number': {
            if (input.val() !== '') json[input.attr('name')] = Number(input.val());
            break;
          }
          default: {
            json[input.attr('name')] = input.val();
          }
        }
      }
    });
    return json;
  };

  /**
   * Inserts values of an object into elements with name attribute
   * @param {Element} element Parent element of input elements
   * @param {Object} json Object with data to be inserted
   */
  fromJson(element, data) {
    const inputs = element.find('[name]');
    inputs.each((index, elem) => {
      const input = $(elem);
      const value = data[input.attr('name')];
      if (value === undefined) return;
      if (input.prop('tagName') === 'TEXTAREA') {
        if (input.data('type') === 'json' || value instanceof Object) {
          input.val(JSON.stringify(value, null, 2));
        }
        else {
          input.val(value);
        }
      }
      else {
        switch (input.attr('type')) {
          case 'text': {
            if (input.data('type') === 'array') {
              input.val(value.join(','));
            }
            else {
              input.val(value);
            }
            break;
          }
          case 'checkbox': {
            input.prop('checked', value);
            break;
          }
          case 'number': {
            input.val(value);
            break;
          }
          default: {
            input.val(value);
          }
        }
      }
    });
  }
}

window.forms = new Forms();