@javascript
Feature: The Flux website
  Scenario: The homepage renders the clock and CSS-only controls
    Given I am on "/"
    Then Flux should be ready
    And I should see "Analogue clock"
    When I run this CSS example interaction:
      """
      document.querySelector('#clock-demo').scrollIntoView({block: 'center'});
      var clockBounds = document.querySelector('#clock-demo').getBoundingClientRect();
      window.dispatchEvent(new PointerEvent('pointermove', {clientX: clockBounds.left + clockBounds.width / 2, clientY: clockBounds.top + clockBounds.height / 2}));
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#clock-demo').style.getPropertyValue('--flux-time-second') !== ''
      && document.querySelector('#clock-demo').style.getPropertyValue('--flux-pointer-x') === '0.5'
      && ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(document.querySelector('.clock-face')).transform)
      """
    When I run this CSS example interaction:
      """
      var range = document.querySelector('#engine-load');
      range.scrollIntoView({block: 'center'});
      range.value = '96'; range.dispatchEvent(new Event('input', {bubbles: true}));
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('.radial-gauge')).animationName === 'strain'
      """
    When I run this CSS example interaction:
      """
      var range = document.querySelector('#engine-load');
      range.value = '40'; range.dispatchEvent(new Event('input', {bubbles: true}));
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('.radial-gauge')).animationName === 'none'
      """
    When I run this CSS example interaction:
      """
      var range = document.querySelector('#power-level');
      range.scrollIntoView({block: 'center'});
      range.value = '3'; range.dispatchEvent(new Event('input', {bubbles: true}));
      """
    Then the CSS example should satisfy:
      """
      [...document.querySelectorAll('.level-current span')].filter(e => getComputedStyle(e).opacity === '1').map(e => e.textContent).join() === 'HIGH'
      """

  Scenario: New tasks persist after reloading
    Given I am on "/"
    Then Flux should be ready
    When I fill the element "#todo-list input[name='item']" with "Review the Flux website"
    And I run this CSS example interaction:
      """
      document.querySelector('#todo-list button[value="add"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#todo-list').textContent.includes('Review the Flux website')
      """
    When I reload the page
    Then Flux should be ready
    And I should see "Review the Flux website"

  Scenario: To-do items can be dragged and their order persists
    Given I have a fresh browser session
    And I am on "/"
    Then Flux should be ready
    And the items in "#todo-list ul" should be ordered "plan,try,share"
    When I run this CSS example interaction:
      """
      document.querySelector('#todo-list').scrollIntoView({block: 'center'});
      """
    And I drag the item with id "plan" to position "3" in "#todo-list ul"
    Then the items in "#todo-list ul" should be ordered "try,share,plan"
    When I reload the page
    Then Flux should be ready
    And the items in "#todo-list ul" should be ordered "try,share,plan"

  Scenario: Search previews the marked server response and submits normally
    Given I am on "/"
    Then Flux should be ready
    When I fill in "Search cities" with "London"
    Then the CSS example should satisfy:
      """
      document.querySelector('[data-flux-autocomplete-mounted]')?.textContent.includes('London, United Kingdom')
      && !document.querySelector('[data-flux-autocomplete-mounted]')?.textContent.includes('Tokyo, Japan')
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#search-demo form').requestSubmit();
      """
    Then I should see "London, United Kingdom"

  Scenario: Link navigation preserves the surrounding scratchpad
    Given I am on "/?page=navigation"
    Then Flux should be ready
    When I fill in "Your scratchpad" with "Keep this thought"
    And I follow "Chapter two"
    Then I should see "Chapter two: CSS properties"
    And the CSS example should satisfy:
      """
      document.querySelector('#navigation-demo textarea').value === 'Keep this thought'
      """
    When I press "Toggle emphasis"
    Then the CSS example should satisfy:
      """
      document.querySelector('#attribute-update').classList.contains('emphasised')
      && document.querySelector('#inner-update').textContent.includes('on')
      && document.querySelector('#outer-update').textContent.includes('on')
      """

  Scenario: Cards move between columns including an empty destination
    Given I am on "/?page=forms"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      document.querySelector('#board').scrollIntoView({block: 'center'});
      """
    And I drag the item with id "build" from "[data-flux-drag-parent='ready']" to position "1" in "[data-flux-drag-parent='finished']"
    Then the items in "[data-flux-drag-parent='finished']" should be ordered "build"
    When I reload the page
    Then Flux should be ready
    And the items in "[data-flux-drag-parent='finished']" should be ordered "build"

  Scenario: Preferences update CSS, validate and save
    Given I am on "/?page=controls"
    Then Flux should be ready
    When I fill the element "#preferences input[name='display-name']" with "Alex"
    Then the CSS property "--flux-form-all-valid" on "#preferences" should become "1"
    When I run this CSS example interaction:
      """
      document.querySelector('#preferences button[value="save"]').scrollIntoView({block: 'center'});
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('#preferences-demo')).opacity === '1'
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#preferences button[value="save"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#saved-name').textContent === 'Alex'
      """

  Scenario: The homepage counter increments and decrements without losing page state
    Given I have a fresh browser session
    And I am on "/"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      window.counterPageMarker = true;
      document.querySelector('#single-counter button[value="plus"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#single-counter output').textContent === '1' && window.counterPageMarker === true
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#single-counter button[value="minus"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#single-counter output').textContent === '0' && window.counterPageMarker === true
      """

  Scenario: Independent forms update their sum and preserve the scratchpad
    Given I have a fresh browser session
    And I am on "/?page=forms"
    Then Flux should be ready
    When I fill in "Your scratchpad" with "Keep my working"
    And I run this CSS example interaction:
      """
      document.querySelector('#counter-a button[value="plus"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#counter-total').textContent === '1'
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#counter-b button[value="plus"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#counter-total').textContent === '2'
      && document.querySelector('#counter-a output').textContent === '1'
      && document.querySelector('#counter-b output').textContent === '1'
      && document.querySelector('#counters-demo textarea').value === 'Keep my working'
      """
    When I reload the page
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      document.querySelector('#counter-total').textContent === '2'
      """

  Scenario Outline: Axis-constrained lists save their order
    Given I have a fresh browser session
    And I am on "/?page=forms"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      document.querySelector('#order-<direction>').scrollIntoView({block: 'center'});
      """
    And I drag the item with id "first" to position "3" in "#order-<direction> ul"
    Then the items in "#order-<direction> ul" should be ordered "second,third,first"
    When I reload the page
    Then Flux should be ready
    And the items in "#order-<direction> ul" should be ordered "second,third,first"

    Examples:
      | direction  |
      | horizontal |
      | vertical   |

  Scenario: Every arrow points towards a pointer outside the grid
    Given I am on "/"
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      [...document.querySelectorAll('main > section.demo')].slice(0, 3).map(e => e.id).join() === 'clock-demo,counter-demo,arrows-demo'
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#arrows-demo').scrollIntoView({block: 'center'});
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('#arrows-demo')).opacity === '1'
      """
    When I run this CSS example interaction:
      """
      var gridBounds = document.querySelector('.arrow-grid').getBoundingClientRect();
      window.arrowPointer = {x: gridBounds.left - 20, y: gridBounds.top + gridBounds.height / 2};
      window.dispatchEvent(new PointerEvent('pointermove', {clientX: arrowPointer.x, clientY: arrowPointer.y}));
      """
    Then the CSS example should satisfy:
      """
      document.querySelectorAll('.arrow-cell').length === 40 && [...document.querySelectorAll('.arrow-cell')].every(cell => {
        var rect = cell.getBoundingClientRect();
        var dx = arrowPointer.x - rect.left - rect.width / 2;
        var dy = arrowPointer.y - rect.top - rect.height / 2;
        var distance = Math.hypot(dx, dy);
        var matrix = new DOMMatrix(getComputedStyle(cell.firstElementChild).transform);
        return Math.abs(matrix.a - dx / distance) < .02 && Math.abs(matrix.b - dy / distance) < .02;
      })
      """

  Scenario: New Kanban tasks appear without reloading and persist after moving
    Given I have a fresh browser session
    And I am on "/?page=forms"
    Then Flux should be ready
    When I fill in "New Kanban task" with "Review <draft> & publish"
    And I run this CSS example interaction:
      """
      window.kanbanPageMarker = true;
      document.querySelector('#board-add-task button').click();
      """
    Then the CSS example should satisfy:
      """
      [...document.querySelectorAll('#board [data-flux-drag-parent="ready"] .item-text')].some(e => e.textContent === 'Review <draft> & publish')
      && document.querySelector('#board [data-flux-drag-parent="ready"] li:last-child .drag-handle') !== null
      && document.querySelector('#board-add-task input[name="item"]').value === ''
      && window.kanbanPageMarker === true
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#board [data-flux-drag-parent="ready"] li:last-child button[data-flux="submit"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#board [data-flux-drag-parent="doing"] .item-text')?.textContent === 'Review <draft> & publish'
      """
    When I reload the page
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      document.querySelector('#board [data-flux-drag-parent="doing"] .item-text')?.textContent === 'Review <draft> & publish'
      && document.querySelectorAll('#board li').length === 3
      """
