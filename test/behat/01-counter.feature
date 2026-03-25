@javascript
Feature: Counter example
  Scenario: Incrementing the counter preserves textarea content
    Given I am on "/01-counter.php"
    Then the element "output" should contain "0"
    When I fill the element "textarea" with:
      """
      Draft note
      """
    And I press the element "button[value='increment']"
    Then I wait until the element "output" contains "1"
    And the element "textarea" should have value "Draft note"
