@javascript
Feature: Counter example
  Scenario: Incrementing the counter preserves textarea content
    Given I am on "/01-counter.php"
    Then Flux should be ready
    Then I should see "0" in the "output" element
    When I fill the element "textarea" with "Keep this note"
    And I press "Increment"
    Then I wait until the element "output" contains "1"
    And the element "textarea" should have value "Keep this note"
