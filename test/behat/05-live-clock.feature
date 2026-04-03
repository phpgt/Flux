@javascript
Feature: Live clock example
  Scenario: The live clock refreshes itself in the background
    Given I am on "/example/05-live-clock.php"
    Then Flux should be ready
    When I remember the time from the page
    And I wait "3" seconds
    Then the remembered time should have advanced "3" seconds

  Scenario: Replacing the full page shell does not stop the live clock
    Given I am on "/example/05-live-clock.php"
    Then Flux should be ready
    When I press "Update clock in form"
    Then I wait until the element "main time[data-flux='live']" changes
    When I remember the time from the page
    And I wait "2" seconds
    Then the remembered time should have advanced "2" seconds
