@javascript
Feature: List example
  Scenario: Adding a list item preserves textarea content
    Given I have a fresh browser session
    And I am on "/example/02-list.php"
    Then Flux should be ready
    When I fill the element "textarea" with "Keep this note"
    And I fill in "New list item" with "Milk"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Milk"
    And the element "input[name='new-item']" should have value ""
    And the element "textarea" should have value "Keep this note"

  Scenario: Adding multiple list items
    Given I have a fresh browser session
    And I am on "/example/02-list.php"
    Then Flux should be ready
    When I fill in "New list item" with "Milk"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Milk"
    When I fill in "New list item" with "Bread"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Bread"
    And I should see "Milk" in the "ul" element

  Scenario: Clicking a list item removes it
    Given I have a fresh browser session
    And I am on "/example/02-list.php"
    Then Flux should be ready
    When I fill in "New list item" with "Milk"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Milk"
    When I follow "Milk"
    Then I wait until I do not see "Milk"

  Scenario: Removing one item keeps the others
    Given I have a fresh browser session
    And I am on "/example/02-list.php"
    Then Flux should be ready
    When I fill in "New list item" with "Milk"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Milk"
    When I fill in "New list item" with "Bread"
    And I press Enter in the element "input[name='new-item']"
    Then I wait until the element "ul" contains "Bread"
    When I follow "Milk"
    Then I wait until I do not see "Milk"
    And I should see "Bread" in the "ul" element
