@javascript
Feature: CSS time and date
  Scenario: The clock hands and connected calendar receive local browser values
    Given I am on "/test/fixtures/example/12-css-time.php"
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      (() => {
        const now = new Date();
        const clock = getComputedStyle(document.querySelector('#local-clock'));
        const calendar = getComputedStyle(document.querySelector('#calendar-preview'));
        return Number(clock.getPropertyValue('--flux-time-hour')) === now.getHours() % 12
          && Number(calendar.getPropertyValue('--flux-date-year')) === now.getFullYear()
          && Number(calendar.getPropertyValue('--flux-date-month')) === now.getMonth() + 1
          && Number(calendar.getPropertyValue('--flux-date-day')) === now.getDate()
          && Number(calendar.getPropertyValue('--flux-date-weekday')) === (now.getDay() + 6) % 7 + 1
          && calendar.getPropertyValue('--flux-date-month-name').trim() === JSON.stringify(new Intl.DateTimeFormat('en-GB', {month: 'long'}).format(now))
          && calendar.getPropertyValue('--flux-day-scalar').trim() !== '';
      })()
      """
    And the CSS example should satisfy:
      """
      (() => {
        const scalar = Number(getComputedStyle(document.querySelector('#local-clock')).getPropertyValue('--flux-time-hour-scalar'));
        const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.clock-hour')).transform);
        const radians = scalar * Math.PI * 2;
        return Math.abs(matrix.a - Math.cos(radians)) < 0.001 && Math.abs(matrix.b - Math.sin(radians)) < 0.001;
      })()
      """
    When I run this CSS example interaction:
      """
      window.previousClockSecond = getComputedStyle(document.querySelector('#calendar-preview')).getPropertyValue('--flux-time-second');
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('#calendar-preview')).getPropertyValue('--flux-time-second') !== window.previousClockSecond
      """

  Scenario: A replaced time source reconnects and translates date names
    Given I am on "/test/fixtures/example/12-css-time.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const clock = document.querySelector('#local-clock');
      clock.outerHTML = '<section id="local-clock" lang="fr-FR" data-flux="(flux-time,flux-date@#calendar-preview)">Horloge</section>';
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('#calendar-preview')).getPropertyValue('--flux-date-day-name').trim() === JSON.stringify(new Intl.DateTimeFormat('fr-FR', {weekday: 'long'}).format(new Date()))
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#local-clock').remove();
      """
    Then the CSS example should satisfy:
      """
      getComputedStyle(document.querySelector('#calendar-preview')).getPropertyValue('--flux-day-scalar').trim() === '' && getComputedStyle(document.querySelector('#calendar-preview')).getPropertyValue('--flux-time-second').trim() === ''
      """
