@javascript
Feature: Kanban example
  Scenario: Dragging a card moves it to another column
    Given I am on "/example/07-kanban.php"
    Then Flux should be ready
    And the items in "[data-flux-drag-parent='todo']" should be ordered "1,2"
    And the items in "[data-flux-drag-parent='doing']" should be ordered "3"
    When I drag the item with id "1" from "[data-flux-drag-parent='todo']" to position "1" in "[data-flux-drag-parent='doing']"
    Then the items in "[data-flux-drag-parent='todo']" should be ordered "2"
    And the items in "[data-flux-drag-parent='doing']" should be ordered "1,3"
    When I reload the page
    Then Flux should be ready
    And the items in "[data-flux-drag-parent='todo']" should be ordered "2"
    And the items in "[data-flux-drag-parent='doing']" should be ordered "1,3"
    When I change the element "[data-flux-drag-parent='done'] .kanban-card-new input[name='title']" to "Review pull request"
    Then the items in "[data-flux-drag-parent='done']" should be ordered "4,5"
    When I change the element "[data-id='5'] input[name='title']" to "Review final patch"
    And I reload the page
    Then Flux should be ready
    And the element "[data-id='5'] input[name='title']" should have value "Review final patch"
    When I change the element "[data-id='5'] input[name='title']" to ""
    Then the items in "[data-flux-drag-parent='done']" should be ordered "4"
    When I change the element "[data-id='4'] input[name='title']" to ""
    Then the items in "[data-flux-drag-parent='done']" should be ordered ""
    When I drag the item with id "2" from "[data-flux-drag-parent='todo']" to position "1" in "[data-flux-drag-parent='done']"
    Then the items in "[data-flux-drag-parent='todo']" should be ordered ""
    And the items in "[data-flux-drag-parent='done']" should be ordered "2"
