@javascript
Feature: Multiple forms example
  Scenario: Independent counters update without clearing textarea content
    Given I am on "/example/03-multiple-forms.php"
    Then Flux should be ready
    And I should see "0" in the "main" element
    When I fill the element "textarea" with "Keep this note"
    And I press "Increment A"
    And I press "Increment A"
    And I press "Increment A"
    Then I wait until the element "output.a" contains "3"
    When I press "Increment B"
    When I press "Increment B"
    When I press "Increment B"
    When I press "Increment B"
    When I press "Increment B"
    Then I wait until the element "output.b" contains "5"

    Then I wait until the element "output.ab" contains "8"
    And the element "textarea" should have value "Keep this note"
