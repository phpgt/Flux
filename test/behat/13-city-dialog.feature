@javascript
Feature: City search and server-rendered dialogs
  Scenario: An autocomplete selection opens a modal without replacing the homepage
    Given I am on "/"
    Then Flux should be ready
    When I fill the element "#search-demo input[name='q']" with "London"
    Then the CSS example should satisfy:
      """
      document.querySelector('[data-flux-autocomplete-mounted] a[data-flux="link"]')?.textContent === 'London, United Kingdom'
      """
    When I run this CSS example interaction:
      """
      window.originalCityUrl = location.href;
      window.originalClock = document.querySelector('#clock-demo');
      document.querySelector('[data-flux-autocomplete-mounted] a[data-flux="link"]').scrollIntoView({block: 'center', behavior: 'instant'});
      window.cityScrollBefore = scrollY;
      document.addEventListener('flux:after-render', () => {
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
          window.cityScrollAfter = scrollY;
        })));
      }, {once: true});
      document.querySelector('[data-flux-autocomplete-mounted] a[data-flux="link"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#city-dialog')?.matches(':modal')
      && document.querySelector('#city-dialog').textContent.includes('London, United Kingdom')
      && location.href === originalCityUrl
      && document.querySelector('#clock-demo') === originalClock
      && cityScrollBefore > 0 && Math.abs(window.cityScrollAfter - cityScrollBefore) < 2
      && document.querySelector('#city-dialog').contains(document.activeElement)
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#city-dialog button').click();
      """
    Then the CSS example should satisfy:
      """
      !document.querySelector('#city-dialog').open
      """
    When I fill the element "#search-demo input[name='q']" with "Tokyo"
    Then the CSS example should satisfy:
      """
      document.querySelector('[data-flux-autocomplete-mounted] a[data-flux="link"]')?.textContent === 'Tokyo, Japan'
      """
    When I run this CSS example interaction:
      """
      document.querySelector('[data-flux-autocomplete-mounted] a[data-flux="link"]').click();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#city-dialog')?.matches(':modal')
      && document.querySelector('#city-dialog').textContent.includes('Tokyo, Japan')
      && document.querySelectorAll('#city-dialog').length === 1
      """

    When I run this CSS example interaction:
      """
      location.reload();
      """
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      !document.querySelector('#city-dialog')
      """

  Scenario: The search page filters cities as you type and removes results when cleared
    Given I am on "/?page=search"
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      document.querySelectorAll('.city-results li').length === 0
      && document.querySelector('#search-results').textContent.includes('Enter a city or country name to search.')
      """
    When I fill the element "#search-demo input[name='q']" with "Canada"
    Then the CSS example should satisfy:
      """
      document.querySelectorAll('.city-results li').length > 1
      && [...document.querySelectorAll('.city-results a')].every(a => a.textContent.includes('Canada'))
      && document.querySelectorAll('#search-results').length === 1
      """
    When I fill the element "#search-demo input[name='q']" with "Tokyo"
    Then the CSS example should satisfy:
      """
      document.querySelectorAll('.city-results li').length === 1
      && document.querySelector('.city-results a').textContent === 'Tokyo, Japan'
      """
    When I fill the element "#search-demo input[name='q']" with ""
    Then the CSS example should satisfy:
      """
      document.querySelectorAll('.city-results li').length === 0
      && document.querySelector('#search-results').textContent.includes('Enter a city or country name to search.')
      && document.querySelectorAll('#search-results').length === 1
      """

  Scenario: A bookmarked search can be refined and submitted without changing the URL
    Given I am on "/?page=search&q=London"
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      document.querySelector('#search-demo input[name="q"]').value === 'London'
      && document.querySelectorAll('.city-results li').length === 1
      """
    When I fill the element "#search-demo input[name='q']" with "Tokyo"
    Then the CSS example should satisfy:
      """
      document.querySelector('.city-results a')?.textContent === 'Tokyo, Japan'
      && document.querySelectorAll('#search-results').length === 1
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#search-demo form').requestSubmit();
      """
    Then Flux should be ready
    And the CSS example should satisfy:
      """
      new URL(location.href).searchParams.get('q') === 'London'
      && document.querySelector('#search-demo input[name="q"]').value === 'Tokyo'
      && document.querySelector('.city-results a')?.textContent === 'Tokyo, Japan'
      """

  Scenario: Unknown cities are handled without reflecting untrusted markup
    Given I am on "/?page=search&city=invalid&q=%3Cscript%3E"
    Then Flux should be ready
    And I should see "City not found"
    And the CSS example should satisfy:
      """
      document.querySelector('#city-dialog').matches(':modal')
      && document.querySelector('#city-search-content script') === null
      """

  Scenario: Clearing the homepage search removes suggestions and another query still works
    Given I am on "/"
    Then Flux should be ready
    When I fill the element "#search-demo input[name='q']" with "London"
    Then the CSS example should satisfy:
      """
      document.querySelector('.city-results a')?.textContent === 'London, United Kingdom'
      """
    When I fill the element "#search-demo input[name='q']" with ""
    Then the CSS example should satisfy:
      """
      document.querySelector('#search-results')?.textContent.includes('Enter a city or country name to search.')
      && document.querySelectorAll('.city-results li').length === 0
      """
    When I fill the element "#search-demo input[name='q']" with "   "
    Then the CSS example should satisfy:
      """
      document.querySelector('#search-results')?.textContent.includes('Enter a city or country name to search.')
      && document.querySelectorAll('.city-results li').length === 0
      """
    When I fill the element "#search-demo input[name='q']" with "Tokyo"
    Then the CSS example should satisfy:
      """
      document.querySelector('.city-results a')?.textContent === 'Tokyo, Japan'
      && document.querySelectorAll('#search-results').length === 1
      """

  Scenario: Submitting the homepage search keeps the URL and renders results
    Given I am on "/"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      window.searchUrlBefore = location.href;
      document.querySelector('#search-demo input[name="q"]').value = 'London';
      document.querySelector('#search-demo form').requestSubmit();
      """
    Then the CSS example should satisfy:
      """
      location.href === searchUrlBefore
      && document.querySelector('.city-results a')?.textContent === 'London, United Kingdom'
      && document.querySelectorAll('#search-results').length === 1
      """
