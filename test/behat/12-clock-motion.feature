@javascript
Feature: Clock hand transitions
  Scenario: Each hand takes the short route around the whole dial
    Given I am on "/?page=time"
    Then Flux should be ready
    When I run this CSS example interaction:
      """
      (() => {
        window.clockMotionErrors = [];
        for(const hand of document.querySelectorAll('.clock-hand')) {
          for(let start = 0; start < 360; start += 6) {
            hand.style.transition = 'none';
            hand.style.setProperty('--clock-hand-angle', `${start}deg`);
            getComputedStyle(hand).transform;
            hand.style.transition = '';
            hand.style.setProperty('--clock-hand-angle', `${(start + 6) % 360}deg`);
            getComputedStyle(hand).transform;
            const transitions = hand.getAnimations();
            if(!transitions.length) throw new Error('Expected clock hand transitions');
            transitions.forEach(transition => transition.pause());
            let overshot = false;
            for(let milliseconds = 0; milliseconds <= 180; milliseconds += 10) {
              transitions.forEach(transition => transition.currentTime = milliseconds);
              const matrix = new DOMMatrix(getComputedStyle(hand).transform);
              const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
              const travelled = ((angle - start + 540) % 360) - 180;
              if(travelled < -0.01 || travelled > 6.5
                || (milliseconds === 180 && Math.abs(travelled - 6) > 0.01)) {
                clockMotionErrors.push(`${hand.className}: ${start} degrees at ${milliseconds}ms travelled ${travelled}`);
              }
              if(travelled > 6.01) overshot = true;
            }
            if(!overshot) clockMotionErrors.push(`Missing subtle bounce at ${start} degrees`);
          }
          hand.style.removeProperty('--clock-hand-angle');
          hand.style.removeProperty('transition');
        }
      })();
      """
    Then the CSS example should satisfy:
      """
      clockMotionErrors.length === 0
      """
