<?php

use Behat\Gherkin\Node\PyStringNode;
use Behat\Mink\Element\NodeElement;
use Behat\Mink\Exception\ExpectationException;
use Behat\MinkExtension\Context\MinkContext;

class FeatureContext extends MinkContext
{
    /**
     * @When I fill the element :selector with:
     */
    public function iFillTheElementWith(string $selector, PyStringNode $value): void
    {
        $this->fillCssElement($selector, (string)$value);
    }

    /**
     * @When I fill the element :selector with :value
     */
    public function iFillTheElementWithValue(string $selector, string $value): void
    {
        $this->fillCssElement($selector, $value);
    }

    /**
     * @Then the element :selector should have value :value
     */
    public function theElementShouldHaveValue(string $selector, string $value): void
    {
        $element = $this->findCssElement($selector);
        $actualValue = (string)$element->getValue();

        if($actualValue !== $value) {
            throw new ExpectationException(
                sprintf('Expected element "%s" to have value "%s", got "%s".', $selector, $value, $actualValue),
                $this->getSession(),
            );
        }
    }

    /**
     * @Then I wait until the element :selector contains :text
     */
    public function iWaitUntilTheElementContains(string $selector, string $text): void
    {
        $escapedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
        $escapedText = json_encode($text, JSON_THROW_ON_ERROR);
        $condition = <<<JS
(() => {
  const element = document.querySelector($escapedSelector);
  return !!element && element.textContent.includes($escapedText);
})()
JS;

        $this->waitForCondition($condition, sprintf('Timed out waiting for "%s" to contain "%s".', $selector, $text));
    }

    /**
     * @Then I wait until I do not see :text
     */
    public function iWaitUntilIDoNotSee(string $text): void
    {
        $escapedText = json_encode($text, JSON_THROW_ON_ERROR);
        $condition = <<<JS
(() => !document.body.textContent.includes($escapedText))()
JS;

        $this->waitForCondition($condition, sprintf('Timed out waiting for "%s" to disappear.', $text));
    }

    /**
     * @Then Flux should be ready
     */
    public function fluxShouldBeReady(): void
    {
        $this->waitForCondition(
            'document.getElementById("flux-style") !== null',
            'Timed out waiting for Flux to initialise on the page.',
        );
    }

    private function fillCssElement(string $selector, string $value): void
    {
        $element = $this->findCssElement($selector);
        $element->setValue($value);
    }

    private function findCssElement(string $selector): NodeElement
    {
        $element = $this->getSession()->getPage()->find('css', $selector);
        if(!$element) {
            throw new ExpectationException(
                sprintf('Could not find element matching CSS selector "%s".', $selector),
                $this->getSession(),
            );
        }

        return $element;
    }

    private function waitForCondition(string $condition, string $errorMessage, int $timeoutMs = 5000): void
    {
        $result = $this->getSession()->wait($timeoutMs, $condition);
        if(!$result) {
            throw new ExpectationException($errorMessage, $this->getSession());
        }
    }
}
