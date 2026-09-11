@javascript
Feature: Scroll position CSS properties
  Scenario: A nested container supplies offsets independently of page scrolling
    Given I am on "/?page=scroll"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const box = document.querySelector('#scroll-offset-box');
      box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
      """
    Then the CSS example should satisfy:
      """
      Math.abs(Number(document.querySelector('#scroll-offset-meter').style.getPropertyValue('--flux-scroll-y')) - 0.5) <= 1 / (document.querySelector('#scroll-offset-box').scrollHeight - document.querySelector('#scroll-offset-box').clientHeight)
      """
    And the CSS example should satisfy:
      """
      Number(document.querySelector('#scroll-offset-meter').style.getPropertyValue('--flux-scroll-y-px')) === document.querySelector('#scroll-offset-box').scrollTop
      && document.querySelector('#scroll-offset-meter').style.getPropertyValue('--flux-scroll-x') === '0'
      """
    When I run this CSS example interaction:
      """
      window.scrollTo({top: document.scrollingElement.scrollHeight, behavior: 'instant'});
      """
    Then the CSS property "--flux-scroll-y" on "body" should become "1"
    And the CSS example should satisfy:
      """
      Math.abs(Number(document.querySelector('#scroll-offset-meter').style.getPropertyValue('--flux-scroll-y')) - 0.5) < 0.002
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-offset-box').scrollTop = 100000;
      """
    Then the CSS property "--flux-scroll-y" on "#scroll-offset-meter" should become "1"

  Scenario: Passage continues before entry and after exit in a bordered scrollport
    Given I am on "/?page=scroll"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-passage-box').scrollIntoView({block: 'center', behavior: 'instant'});
      """
    Then the CSS property "opacity" on "#scroll-passage-demo" should become "1"
    And the CSS example should satisfy:
      """
      Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y')) < 0
      && Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y-inverse')) > 1
      && Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-midway-y')) < 0
      """
    When I run this CSS example interaction:
      """
      const box = document.querySelector('#scroll-passage-box');
      const marker = document.querySelector('#scroll-passage-marker');
      box.style.border = '5px solid';
      window.passageEntry = box.scrollTop + marker.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientTop - box.clientHeight;
      window.passageDistance = box.clientHeight + marker.getBoundingClientRect().height;
      box.scrollTop = window.passageEntry;
      """
    # Browser scroll offsets can round to a whole pixel while layout stays fractional.
    Then the CSS example should satisfy:
      """
      Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y')) - 0) < 1 / window.passageDistance
      && Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-midway-y')) - 0) < 2 / window.passageDistance
      && Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y-inverse')) - 1) < 1 / window.passageDistance
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-passage-box').scrollTop = window.passageEntry + window.passageDistance / 2;
      """
    # Browser scroll offsets can round to a whole pixel while layout stays fractional.
    Then the CSS example should satisfy:
      """
      Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y')) - 0.5) < 1 / window.passageDistance
      && Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-midway-y')) - 1) < 2 / window.passageDistance
      && Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y-inverse')) - 0.5) < 1 / window.passageDistance
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-passage-box').scrollTop = window.passageEntry + window.passageDistance;
      """
    # Browser scroll offsets can round to a whole pixel while layout stays fractional.
    Then the CSS example should satisfy:
      """
      Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y')) - 1) < 1 / window.passageDistance
      && Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-midway-y')) - 0) < 2 / window.passageDistance
      && Math.abs(Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y-inverse')) - 0) < 1 / window.passageDistance
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-passage-box').scrollTop = 100000;
      """
    Then the CSS example should satisfy:
      """
      Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y')) > 1
      && Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y-inverse')) < 0
      && Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-midway-y')) < 0
      """
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-passage-box').scrollTop = 0;
      """
    Then the CSS example should satisfy:
      """
      Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y')) < 0
      && Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-progress-y-inverse')) > 1
      && Number(document.querySelector('#scroll-passage-meter').style.getPropertyValue('--flux-scroll-midway-y')) < 0
      """

  Scenario: Scroll ranges refresh when content grows inside a fixed-size box
    Given I am on "/?page=scroll"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      document.querySelector('#scroll-offset-box').scrollTop = 100000;
      """
    Then the CSS property "--flux-scroll-y" on "#scroll-offset-meter" should become "1"
    When I run this CSS example interaction:
      """
      const reading = document.querySelector('.scroll-reading');
      reading.style.height = (reading.getBoundingClientRect().height + 400) + 'px';
      """
    Then the CSS example should satisfy:
      """
      (() => {
        const box = document.querySelector('#scroll-offset-box');
        const value = Number(document.querySelector('#scroll-offset-meter').style.getPropertyValue('--flux-scroll-y'));
        return value > 0 && value < 1 && Math.abs(value - box.scrollTop / (box.scrollHeight - box.clientHeight)) < 0.0001;
      })()
      """

  Scenario: Horizontal scroll sources initialise and clean up on dynamic content
    Given I am on "/?page=scroll"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      const host = document.createElement('section');
      host.id = 'horizontal-scroll';
      host.dataset.flux = 'flux-scroll';
      host.style.cssText = 'width:200px;height:120px;overflow:scroll;border:5px solid;padding:0;box-sizing:content-box;';
      host.innerHTML = '<div style="width:800px"><div id="horizontal-marker" style="margin-left:300px;width:100px;height:60px" data-flux="(flux-scroll-progress@#horizontal-meter)">Marker</div></div>';
      const meter = document.createElement('output');
      meter.id = 'horizontal-meter';
      document.body.append(host, meter);
      host.scrollLeft = 300 - host.clientWidth;
      """
    Then the CSS property "--flux-scroll-progress-x" on "#horizontal-meter" should become "0"
    And the CSS property "--flux-scroll-progress-x-inverse" on "#horizontal-meter" should become "1"
    When I run this CSS example interaction:
      """
      document.querySelector('#horizontal-scroll').scrollLeft = 400;
      """
    Then the CSS property "--flux-scroll-progress-x" on "#horizontal-meter" should become "1"
    And the CSS property "--flux-scroll-progress-x-inverse" on "#horizontal-meter" should become "0"
    And the CSS property "--flux-scroll-midway-x" on "#horizontal-meter" should become "0"
    And the CSS property "--flux-scroll-x-px" on "#horizontal-scroll" should become "400"
    When I run this CSS example interaction:
      """
      document.querySelector('#horizontal-scroll').remove();
      """
    Then the CSS example should satisfy:
      """
      document.querySelector('#horizontal-meter').style.getPropertyValue('--flux-scroll-progress-x') === ''
      && document.querySelector('#horizontal-meter').style.getPropertyValue('--flux-scroll-midway-x') === ''
      """
