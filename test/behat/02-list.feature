@javascript
Feature: List example
  Scenario: Adding and removing a list item preserves textarea content
    Given I am on "/example/02-list.php"
    Then Flux should be ready
    When I fill the element "textarea" with "Keep this note"
    And I fill in "New list item" with "Milk"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Milk"
    And the element "input[name='new-item']" should have value ""
    And the element "textarea" should have value "Keep this note"
    When I follow "Milk"
    Then I wait until I do not see "Milk"
