@javascript
Feature: Scroll position after drag ordering
  Scenario Outline: Dropping an item preserves scroll when the previously focused field is off-screen
    Given I have a fresh browser session
    And I am on "<path>"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      var tallListStyle = document.createElement('style');
      tallListStyle.textContent = '#todo-list > ul { min-height: 150vh; }';
      document.head.append(tallListStyle);
      document.querySelector('#todo-list ul').scrollIntoView({block: 'start', behavior: 'instant'});
      document.querySelector('#todo-list input[name="item"]').focus({preventScroll: true});
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#todo-demo').style.getPropertyValue('--flux-first-visible') === '1'
      && !document.querySelector('#todo-demo').getAnimations().some(animation => animation.playState === 'running')
      && document.activeElement.getBoundingClientRect().top > innerHeight
      """
    When I run this CSS example interaction:
      """
      window.todoScrollBeforeDrop = scrollY;
      window.todoDropRendered = false;
      document.addEventListener('flux:after-render', () => {
        requestAnimationFrame(() => { window.todoDropRendered = true; });
      }, {once: true});
      """
    And I drag the item with id "plan" to position "2" in "#todo-list ul"
    Then the CSS example should satisfy:
      """
      window.todoDropRendered
      && Math.abs(scrollY - window.todoScrollBeforeDrop) < 2
      && document.activeElement === document.querySelector('#todo-list input[name="item"]')
      && [...document.querySelectorAll('#todo-list ul > li')].map(item => item.dataset.id).join() === 'try,plan,share'
      """

    Examples:
      | path         |
      | /            |
      | /?page=forms |
