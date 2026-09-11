@javascript
Feature: Live clock example
  Scenario: The live clock refreshes itself in the background
    Given I am on "/test/fixtures/example/05-live-clock.php"
    Then Flux should be ready
    When I remember the time from the page
    And I wait "3" seconds
    Then the remembered time should have advanced "3" seconds

  Scenario: Replacing the full page shell does not stop the live clock
    Given I am on "/test/fixtures/example/05-live-clock.php"
    Then Flux should be ready
    When I press "Update clock in form"
    Then I wait until the element "main time[data-flux='live']" changes
    When I remember the time from the page
    And I wait "2" seconds
    Then the remembered time should have advanced "2" seconds

  Scenario: An off-screen live region stops polling and resumes when it returns
    Given I am on "/test/fixtures/example/05-live-clock.php"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      window.liveRequests = 0;
      document.addEventListener('flux:before-request', () => window.liveRequests++);
      document.querySelector('main').style.marginTop = '200vh';
      """
    And I wait "2" seconds
    Then the CSS example should satisfy:
      """
      window.liveRequests === 0
      """
    When I run this CSS example interaction:
      """
      document.querySelector('main').style.marginTop = '0';
      document.querySelector('time[data-flux="live"]').scrollIntoView({block: 'center'});
      """
    Then the CSS example should satisfy:
      """
      window.liveRequests > 0
      """
