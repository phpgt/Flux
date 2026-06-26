@javascript
Feature: Search autocomplete example
  Scenario: Search results preview without taking over normal form submission
    Given I am on "/example/08-search.php"
    Then Flux should be ready
    When I change the element "input[name='query']" to "London"
    Then I wait until the element "[data-flux='autocomplete-results']" contains "10 Downing Street"
    And the current URL path should be "/example/08-search.php"
    When I press the ArrowDown key in the element "input[name='query']"
    Then the active element should contain "10 Downing Street"
    When I press the ArrowUp key in the active element
    Then the element "input[name='query']" should be focussed
    When I press Enter in the element "input[name='query']"
    Then I wait until the element "[data-flux='autocomplete-results']" contains "Waterloo Station"
    And the current URL path should be "/example/08a-search-results.php"
