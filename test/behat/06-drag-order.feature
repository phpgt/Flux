@javascript
Feature: Drag order example
  Scenario: Dragging an item submits its new order in the background
    Given I am on "/example/06-drag-order.php"
    Then Flux should be ready
    And the items in "ul.drag-drop" should be ordered "1,2,3,4,5,6,7,8,9,10"
    When I drag the item with id "1" to position "4" in "ul.drag-drop"
    Then the items in "ul.drag-drop" should be ordered "2,3,4,1,5,6,7,8,9,10"
    When I reload the page
    Then Flux should be ready
    And the items in "ul.drag-drop" should be ordered "2,3,4,1,5,6,7,8,9,10"
