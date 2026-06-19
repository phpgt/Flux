@javascript
Feature: Kanban example
  Scenario: Dragging a card moves it to another column
    Given I am on "/example/07-kanban.php"
    Then Flux should be ready
    And the items in ".kanban-board" should be ordered "todo,doing,done"
    When I change the element "[data-id='doing'] > .kanban-column-form input[name='title']" to "In progress"
    And I reload the page
    Then Flux should be ready
    And the element "[data-id='doing'] > .kanban-column-form input[name='title']" should have value "In progress"
    When I drag the item with id "done" to position "1" in ".kanban-board"
    Then the items in ".kanban-board" should be ordered "done,todo,doing"
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
    When I change the element ".kanban-column-new .kanban-column-form input[name='title']" to "Backlog"
    Then the items in ".kanban-board" should be ordered "done,todo,doing,column-4"
    And the element "[data-id='column-4'] > .kanban-column-form input[name='title']" should have value "Backlog"
