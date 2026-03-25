@javascript
Feature: List example
  Scenario: Adding and removing a list item preserves textarea content
    Given I am on "/02-list.php"
    When I fill the element "textarea" with "Keep this note"
    And I fill in "New list item" with "Milk"
    And I press the element "button[value='add']"
    Then I wait until the element "ul" contains "Milk"
    And the element "textarea" should have value "Keep this note"
    When I click the element "a[data-flux='link']"
    Then I wait until I do not see "Milk"
