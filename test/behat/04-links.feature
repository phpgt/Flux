@javascript
Feature: Link navigation example
  Scenario: Following Flux links replaces the page shell but preserves the scratchpad
    Given I am on "/example/04-links.php"
    Then Flux should be ready
    When I fill the element "textarea" with "Keep this note"
    And I follow "Page 1"
    Then I wait until the element "main" contains "Page 1: Dispatch board"
    When I follow "Page 2"
    Then I wait until the element "main" contains "Page 2: Editorial notes"
    And the element "textarea" should have value "Keep this note"

  Scenario: Inner form updates stay in place on the landing page
    Given I am on "/example/04-links.php"
    Then Flux should be ready
    When I fill the element "textarea" with "Keep this note"
    And I fill in "Search term" with "flux link demo"
    And I press "Update card"
    Then I wait until the element "main" contains "flux link demo"
    And I should see "Landing page" in the "main" element
    And the element "textarea" should have value "Keep this note"
